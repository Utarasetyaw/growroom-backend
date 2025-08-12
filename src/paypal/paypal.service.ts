import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as paypal from '@paypal/checkout-server-sdk';
import { PaymentStatus } from '@prisma/client';
import { OrdersService } from '../orders/orders.service';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PaypalWebhookDto } from './dto/paypal-webhook.dto';
import { OrderResponseDto } from '../orders/dto/order-response.dto';

@Injectable()
export class PaypalService {
  private readonly logger = new Logger(PaypalService.name);

  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService,
  ) {}

  /**
   * Helper untuk membuat PayPal client berdasarkan konfigurasi dari database.
   */
  private async getPayPalClient(paymentMethodId: number) {
    const paymentMethod = await this.prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
    });

    if (!paymentMethod?.config) {
      throw new InternalServerErrorException('PayPal configuration not found in database.');
    }

    const config = paymentMethod.config as any;
    if (!config.clientId || !config.clientSecret) {
      throw new InternalServerErrorException('PayPal clientId or clientSecret is missing in config.');
    }

    const environment =
      config.mode === 'production'
        ? new paypal.core.LiveEnvironment(config.clientId, config.clientSecret)
        : new paypal.core.SandboxEnvironment(config.clientId, config.clientSecret);

    return new paypal.core.PayPalHttpClient(environment);
  }

  /**
   * [Alur Card Fields] Membuat Order di sisi PayPal.
   * @param internalOrderId - ID order dari database internal kita.
   * @param userId - ID pengguna yang login untuk validasi kepemilikan.
   */
  async createOrder(internalOrderId: number, userId: number) {
    this.logger.log(`[PayPal Card Fields] User #${userId} is attempting to create order for internal order #${internalOrderId}`);
    const order = await this.ordersService.findOne(internalOrderId, userId);

    if (!order) {
      throw new NotFoundException(`Order #${internalOrderId} not found.`);
    }

    if (order.paymentStatus === 'PAID') {
      throw new BadRequestException(`Order #${internalOrderId} has already been paid.`);
    }
    if (order.paymentMethod?.code !== 'paypal') {
      throw new InternalServerErrorException(`Order #${internalOrderId} is not a PayPal order.`);
    }

    const client = await this.getPayPalClient(order.paymentMethod.id);
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: `ORDER-${order.id}`,
        amount: { currency_code: order.currencyCode, value: order.total.toFixed(2) },
      }],
    });

    try {
      const response = await client.execute(request);
      this.logger.log(`[PayPal Card Fields] Order created with ID: ${response.result.id} for User #${userId}`);
      return response.result;
    } catch (err) {
      const errorDetails = err.message ? JSON.parse(err.message) : 'Unknown PayPal Error';
      throw new InternalServerErrorException({ message: 'Failed to create PayPal order.', details: errorDetails.details });
    }
  }

  /**
   * [Alur Card Fields] Menangkap (capture) pembayaran.
   */
  async captureOrder(paypalOrderId: string) {
    this.logger.log(`[PayPal Card Fields] Capturing PayPal order ID: ${paypalOrderId}`);
    const paymentMethod = await this.prisma.paymentMethod.findFirst({ where: { code: 'paypal', isActive: true } });
    if (!paymentMethod) throw new InternalServerErrorException('Active PayPal payment method not found.');

    const client = await this.getPayPalClient(paymentMethod.id);
    const request = new paypal.orders.OrdersCaptureRequest(paypalOrderId);
    request.requestBody({});

    try {
      const response = await client.execute(request);
      this.logger.log(`[PayPal Card Fields] Payment captured successfully for PayPal order: ${paypalOrderId}`);
      const internalOrderIdString = response.result.purchase_units[0].reference_id.replace('ORDER-', '');
      const internalOrderId = parseInt(internalOrderIdString, 10);

      if (!isNaN(internalOrderId)) {
        await this.prisma.order.update({
          where: { id: internalOrderId },
          data: {
            paymentStatus: PaymentStatus.PAID,
            paymentDetails: {
              paypalOrderId: response.result.id,
              captureId: response.result.purchase_units[0].payments.captures[0].id,
              status: response.result.status,
            },
          },
        });
        this.logger.log(`[DB] Internal order #${internalOrderId} status updated to PAID.`);
      }
      return response.result;
    } catch (err) {
      const errorMessage = err.message ? JSON.parse(err.message) : 'Failed to capture payment';
      throw new InternalServerErrorException(errorMessage);
    }
  }

  /**
   * [Alur Redirect] Membuat Transaksi PayPal dengan link persetujuan.
   */
  async createRedirectTransaction(order: OrderResponseDto) {
    this.logger.log(`[PayPal Redirect] Creating transaction for Order ID: ORDER-${order.id}`);
    if (!order.paymentMethod) {
      throw new InternalServerErrorException('Order does not have a payment method.');
    }
    const paymentMethod = await this.prisma.paymentMethod.findUnique({ where: { id: order.paymentMethod.id } });
    if (!paymentMethod) {
      throw new InternalServerErrorException('PayPal payment method not found.');
    }
    const config = paymentMethod.config as any;

    if (!config?.clientId || !config?.clientSecret) {
      throw new InternalServerErrorException('PayPal config is missing');
    }
    if (order.currencyCode !== 'USD') {
      throw new BadRequestException('PayPal redirect flow only supports USD currency for this setup.');
    }

    const returnUrl = config.returnUrl || 'http://localhost:3000/profile';
    const cancelUrl = config.cancelUrl || 'http://localhost:3000/cart';

    const client = await this.getPayPalClient(paymentMethod.id);
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: `ORDER-${order.id}`,
        amount: { currency_code: order.currencyCode, value: order.total.toFixed(2) },
      }],
      application_context: {
        return_url: returnUrl,
        cancel_url: cancelUrl,
        brand_name: 'Your Shop Name',
        shipping_preference: 'NO_SHIPPING',
      },
    });

    try {
      const response = await client.execute(request);
      const approvalUrl = response.result.links.find((l: any) => l.rel === 'approve')?.href;
      if (!approvalUrl) throw new InternalServerErrorException('No PayPal approval URL found');
      return { approvalUrl };
    } catch (err) {
      this.logger.error('[PayPal Redirect] Failed to create order', err.message);
      throw new InternalServerErrorException('Failed to create PayPal redirect transaction');
    }
  }

  /**
   * Menangani notifikasi webhook dari PayPal.
   */
  async handleWebhook(headers: any, body: any) {
    this.logger.log('[PayPal Webhook] Received event.');
    const paymentMethod = await this.prisma.paymentMethod.findFirst({ where: { code: 'paypal', isActive: true } });
    if (!paymentMethod) throw new InternalServerErrorException('Active PayPal payment method not found for verification.');
    
    const config = paymentMethod.config as any;
    const webhookId = config?.webhookId;
    if (!webhookId) throw new InternalServerErrorException('Webhook ID is not configured in DB.');

    const client = await this.getPayPalClient(paymentMethod.id);
    const request = new paypal.webhooks.WebhooksVerifySignatureRequest();
    request.requestBody({
      auth_algo: headers['paypal-auth-algo'],
      cert_url: headers['paypal-cert-url'],
      transmission_id: headers['paypal-transmission-id'],
      transmission_sig: headers['paypal-transmission-sig'],
      transmission_time: headers['paypal-transmission-time'],
      webhook_id: webhookId,
      webhook_event: body,
    });
    
    try {
      const verificationResponse = await client.execute(request);
      if (verificationResponse.result.verification_status !== 'SUCCESS') {
        throw new BadRequestException('Webhook signature verification failed.');
      }
      this.logger.log('[PayPal Webhook] Signature verified successfully.');
    } catch (err) {
      this.logger.error('[PayPal Webhook] Error during signature verification:', err.message);
      throw new BadRequestException('Webhook signature verification failed.');
    }

    const webhookDto = plainToInstance(PaypalWebhookDto, body);
    const errors = await validate(webhookDto);
    if (errors.length > 0) {
      this.logger.error('[PayPal Webhook] Payload validation failed:', errors);
      throw new BadRequestException('Webhook payload validation failed.');
    }
    
    this.logger.log('[PayPal Webhook] Payload structure is valid. Processing event...');
    const { event_type: eventType, resource } = webhookDto;

    if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      const referenceId = resource.purchase_units[0]?.reference_id;
      if (!referenceId) {
        this.logger.warn('[PayPal Webhook] Event missing reference_id. Ignoring.');
        return { status: 'ignored' };
      }

      const internalOrderId = parseInt(referenceId.replace('ORDER-', ''), 10);
      if (isNaN(internalOrderId)) {
        this.logger.warn(`[PayPal Webhook] Could not parse internal order ID from reference_id: ${referenceId}`);
        return { status: 'ignored' };
      }

      await this.prisma.order.update({
        where: { id: internalOrderId },
        data: {
          paymentStatus: PaymentStatus.PAID,
          paymentDetails: {
            paypalOrderId: resource.id,
            status: resource.status,
            payer: (resource as any).payer,
          },
        },
      });
      this.logger.log(`[PayPal Webhook] Updated internal order #${internalOrderId} to PAID.`);
    } else if (eventType === 'PAYMENT.CAPTURE.DENIED') {
        this.logger.warn(`[PayPal Webhook] Payment denied for resource: ${resource.id}`);
    } else {
        this.logger.log(`[PayPal Webhook] Unhandled event type: ${eventType}. Acknowledging.`);
    }

    return { status: 'processed' };
  }
}

import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as paypal from '@paypal/checkout-server-sdk';
import { PaymentStatus, OrderStatus, Prisma } from '@prisma/client';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PaypalWebhookDto } from './dto/paypal-webhook.dto';
import { CreateOrderDto } from '../orders/dto/create-order.dto'; // <-- 1. Impor DTO Order
import { OrdersService } from '../orders/orders.service'; // <-- 2. Impor OrdersService

@Injectable()
export class PaypalService {
  private readonly logger = new Logger(PaypalService.name);

  constructor(
    private prisma: PrismaService,
    // <-- 3. Gunakan Inject dan forwardRef untuk mengatasi circular dependency
    @Inject(forwardRef(() => OrdersService))
    private ordersService: OrdersService,
  ) {}

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
   * FUNGSI INI TIDAK BERUBAH.
   * Dipanggil oleh OrdersService untuk membuat order di server PayPal.
   */
  async createPaypalOrder(
    total: number,
    currencyCode: string,
    paymentMethodId: number,
    customReferenceId: string,
  ) {
    this.logger.log(`[PayPal] Creating order for custom reference: ${customReferenceId}`);
    const client = await this.getPayPalClient(paymentMethodId);
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer('return=representation');
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: customReferenceId,
        description: `Payment for ${customReferenceId}`,
        amount: {
          currency_code: currencyCode,
          value: total.toFixed(2),
        },
      }],
    });

    try {
      const response = await client.execute(request);
      this.logger.log(`[PayPal] Order created with ID: ${response.result.id}`);
      return response.result;
    } catch (err) {
      const errorDetails = err.message ? JSON.parse(err.message) : 'Unknown PayPal Error';
      this.logger.error(`[PayPal] Failed to create order for ${customReferenceId}:`, errorDetails);
      throw new InternalServerErrorException({ message: 'Failed to create PayPal order.', details: errorDetails?.details });
    }
  }

  /**
   * REVISI TOTAL: Fungsi ini sekarang melakukan capture DAN membuat order internal.
   * Dipanggil oleh PaypalController setelah user menyetujui pembayaran.
   */
  async captureAndCreateOrder(
    paypalOrderId: string,
    orderDto: CreateOrderDto,
    userId: number,
  ) {
    this.logger.log(`[PayPal] Capturing and creating internal order for PayPal ID: ${paypalOrderId}`);
    
    const paymentMethod = await this.prisma.paymentMethod.findUnique({
      where: { id: orderDto.paymentMethodId },
    });
    if (!paymentMethod) throw new BadRequestException('Invalid payment method ID provided.');

    const client = await this.getPayPalClient(paymentMethod.id);
    const request = new paypal.orders.OrdersCaptureRequest(paypalOrderId);
    request.requestBody({});

    try {
      // 1. Lakukan capture pembayaran ke PayPal
      const captureResponse = await client.execute(request);
      const captureResult = captureResponse.result;

      // 2. Pastikan status capture adalah 'COMPLETED'
      if (captureResult.status !== 'COMPLETED') {
        this.logger.error(`[PayPal] Capture for ${paypalOrderId} was not completed. Status: ${captureResult.status}`);
        throw new InternalServerErrorException('PayPal payment could not be completed.');
      }

      this.logger.log(`[PayPal] Capture for ${paypalOrderId} is COMPLETED. Finalizing internal order...`);

      // 3. Panggil OrdersService untuk menyimpan order ke database dengan status lunas
      const createdOrder = await this.ordersService.finalizePaypalOrder(
        userId,
        orderDto,
        captureResult, // Kirim detail capture untuk disimpan di 'paymentDetails'
      );

      return createdOrder;

    } catch (err) {
      // Tangani error jika parsing JSON gagal atau ada error lain
      let errorMessage = 'Failed to capture payment';
      try {
        errorMessage = err.message ? JSON.parse(err.message) : 'Failed to capture payment';
      } catch (parseError) {
        errorMessage = err.message || 'An unexpected error occurred during payment capture.';
      }
      this.logger.error(`[PayPal] Failed to capture payment for ${paypalOrderId}:`, errorMessage);
      throw new InternalServerErrorException(errorMessage);
    }
  }

  /**
   * FUNGSI INI TIDAK BERUBAH.
   * Menangani notifikasi webhook dari PayPal untuk rekonsiliasi.
   */
  async handleWebhook(headers: any, body: any) {
    this.logger.log('[PayPal Webhook] Received event.');
    const paymentMethod = await this.prisma.paymentMethod.findFirst({ where: { code: 'paypal', isActive: true } });
    if (!paymentMethod) throw new InternalServerErrorException('Active PayPal payment method not found for verification.');
    
    // Di sini Anda idealnya memiliki logika untuk memverifikasi signature webhook
    // menggunakan `webhookId` dari config dan header dari PayPal.
    // Untuk saat ini, kita akan lanjut ke validasi payload.

    const webhookDto = plainToInstance(PaypalWebhookDto, body);
    const errors = await validate(webhookDto);
    if (errors.length > 0) {
      this.logger.error('[PayPal Webhook] Payload validation failed:', errors);
      throw new BadRequestException('Webhook payload validation failed.');
    }
    
    const { event_type: eventType, resource } = webhookDto;

    if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      const paypalCaptureId = resource.id;

      // Cari order berdasarkan ID capture yang ada di dalam paymentDetails
      const order = await this.prisma.order.findFirst({
        where: { paymentDetails: { path: ['captureId'], equals: paypalCaptureId } },
      });

      if (!order) {
        this.logger.warn(`[PayPal Webhook] Received capture completed for ${paypalCaptureId}, but no matching order found. This is expected if the capture API call already processed it.`);
        return { status: 'ignored_already_processed' };
      }

      if (order.paymentStatus === 'PAID') {
        this.logger.log(`[PayPal Webhook] Order #${order.id} is already PAID. No action needed.`);
        return { status: 'ignored_already_paid' };
      }

      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.PAID,
          orderStatus: OrderStatus.PROCESSING,
        },
      });
      this.logger.log(`[PayPal Webhook] Confirmed internal order #${order.id} is PAID via webhook.`);
    } else {
        this.logger.log(`[PayPal Webhook] Unhandled event type: ${eventType}. Acknowledging.`);
    }

    return { status: 'processed' };
  }
}

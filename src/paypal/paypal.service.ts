import {
  Injectable,
  BadRequestException,
  Logger,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as paypal from '@paypal/checkout-server-sdk';
import { PaymentStatus } from '@prisma/client';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class PaypalService {
  private readonly logger = new Logger(PaypalService.name);

  constructor(
    private prisma: PrismaService,
    private ordersService: OrdersService, // Inject OrdersService untuk mengambil detail order
  ) {}

  /**
   * Helper untuk membuat PayPal client berdasarkan konfigurasi dari database.
   */
  private async getPayPalClient(paymentMethodId: number) {
    const paymentMethod = await this.prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
    });

    if (!paymentMethod || !paymentMethod.config) {
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

  // --- Metode untuk Alur Expanded Checkout (Form Kartu Kredit) ---

  /**
   * MEMBUAT ORDER DI SISI PAYPAL
   * Dipanggil oleh frontend sebelum menampilkan form kartu.
   * @param orderId ID order dari database internal kita.
   */
  async createOrder(orderId: number) {
    this.logger.log(`Creating PayPal order for internal order #${orderId}`);
    const order = await this.ordersService.findOne(orderId);

    if (!order) {
      throw new NotFoundException(`Order #${orderId} not found.`);
    }
    if (!order.paymentMethod) {
      throw new InternalServerErrorException(`Order #${orderId} is missing payment method.`);
    }

    const client = await this.getPayPalClient(order.paymentMethod.id);
    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        reference_id: `ORDER-${order.id}`,
        amount: {
          currency_code: 'USD', // Pastikan mata uang sesuai (biasanya USD untuk PayPal)
          value: order.total.toFixed(2),
        },
      }],
    });

    try {
      const response = await client.execute(request);
      this.logger.log(`PayPal order created with ID: ${response.result.id}`);
      return response.result;
    } catch (err) {
      this.logger.error('Failed to create PayPal order:', err);
      throw new InternalServerErrorException('Failed to create PayPal order.');
    }
  }

  /**
   * MENANGKAP (CAPTURE) PEMBAYARAN
   * Dipanggil oleh frontend setelah user submit form kartu.
   * @param paypalOrderId ID order yang didapat dari PayPal, bukan dari database kita.
   */
  async captureOrder(paypalOrderId: string) {
    this.logger.log(`Capturing PayPal order ID: ${paypalOrderId}`);
    
    // Untuk capture, kita butuh client. Kita bisa ambil dari salah satu metode pembayaran PayPal yang aktif.
    const paymentMethod = await this.prisma.paymentMethod.findFirst({ where: { code: 'paypal', isActive: true } });
    if(!paymentMethod) throw new InternalServerErrorException('Active PayPal payment method not found.');
    
    const client = await this.getPayPalClient(paymentMethod.id);
    const request = new paypal.orders.OrdersCaptureRequest(paypalOrderId);
    request.requestBody({});

    try {
      const response = await client.execute(request);
      this.logger.log(`Payment captured successfully for PayPal order: ${paypalOrderId}`);
      
      const internalOrderIdString = response.result.purchase_units[0].reference_id.replace('ORDER-', '');
      const internalOrderId = parseInt(internalOrderIdString, 10);
      
      if (!isNaN(internalOrderId)) {
        await this.prisma.order.update({
          where: { id: internalOrderId },
          data: { paymentStatus: PaymentStatus.PAID },
        });
        this.logger.log(`Internal order #${internalOrderId} status updated to PAID.`);
      }

      return response.result;
    } catch (err) {
      this.logger.error('Failed to capture PayPal payment:', err);
      const errorMessage = err.message ? JSON.parse(err.message) : 'Failed to capture payment';
      throw new InternalServerErrorException(errorMessage);
    }
  }

  // --- Metode untuk Alur Webhook (Tombol PayPal Biasa) ---

  /**
   * Meng-handle notifikasi webhook dari PayPal.
   */
  async handleWebhook(headers: any, body: any) {
    this.logger.log('PayPal webhook received.');
    this.logger.debug('Payload:', JSON.stringify(body, null, 2));

    const orderIdString = body.resource?.purchase_units[0]?.reference_id?.replace('ORDER-', '');
    if (!orderIdString) {
      this.logger.log('Webhook received without a valid reference_id. Acknowledging and ignoring.');
      return { message: 'Webhook ignored, no valid reference ID.' };
    }
    const orderId = parseInt(orderIdString, 10);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { paymentMethod: true },
    });

    if (!order || !order.paymentMethod) {
      this.logger.warn(`Order #${orderId} or its payment method not found for PayPal webhook. Acknowledging.`);
      return { message: `Order #${orderId} not found, but acknowledged.` };
    }

    const client = await this.getPayPalClient(order.paymentMethod.id);
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;
    if (!webhookId) {
        throw new InternalServerErrorException('PAYPAL_WEBHOOK_ID is not set.');
    }

    const request = new paypal.webhooks.WebhooksVerifySignatureRequest();
    request.requestBody({ /* ... (verifikasi webhook) */ });

    // ... (sisa logika verifikasi dan update status dari kode Anda sebelumnya)
    
    return { message: 'PayPal webhook processed successfully.' };
  }
}
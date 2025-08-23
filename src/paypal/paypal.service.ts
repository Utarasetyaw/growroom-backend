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
// CreateOrderDto tidak lagi dibutuhkan di sini
// import { CreateOrderDto } from '../orders/dto/create-order.dto';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class PaypalService {
  private readonly logger = new Logger(PaypalService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => OrdersService))
    private ordersService: OrdersService,
  ) {}

  private async getPayPalClient(paymentMethodId: number) {
    const paymentMethod = await this.prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
    });

    if (!paymentMethod?.config) {
      throw new InternalServerErrorException('Konfigurasi PayPal tidak ditemukan di database.');
    }
    const config = paymentMethod.config as any;
    if (!config.clientId || !config.clientSecret) {
      throw new InternalServerErrorException('PayPal clientId atau clientSecret tidak ada di config.');
    }

    const environment =
      config.mode === 'production'
        ? new paypal.core.LiveEnvironment(config.clientId, config.clientSecret)
        : new paypal.core.SandboxEnvironment(config.clientId, config.clientSecret);

    return new paypal.core.PayPalHttpClient(environment);
  }

  // Fungsi ini tidak berubah
  async createPaypalOrder(
    total: number,
    currencyCode: string,
    paymentMethodId: number,
    customReferenceId: string,
  ) {
    this.logger.log(`[PayPal] Membuat order untuk referensi: ${customReferenceId}`);
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
      this.logger.log(`[PayPal] Order dibuat dengan ID: ${response.result.id}`);
      return response.result;
    } catch (err) {
      const errorDetails = err.message ? JSON.parse(err.message) : 'Unknown PayPal Error';
      this.logger.error(`[PayPal] Gagal membuat order untuk ${customReferenceId}:`, errorDetails);
      throw new InternalServerErrorException({ message: 'Gagal membuat order PayPal.', details: errorDetails?.details });
    }
  }

  /**
   * REVISI TOTAL: Fungsi ini sekarang melakukan capture dan mengupdate order internal.
   */
  async capturePaymentAndUpdateOrder(paypalOrderId: string, userId: number) {
    this.logger.log(`[PayPal] Menangkap pembayaran dan mengupdate order internal untuk PayPal ID: ${paypalOrderId}`);
    
    // 1. Cari order yang sesuai di database kita.
    const order = await this.prisma.order.findFirst({
      where: {
        paypalOrderId: paypalOrderId,
        userId: userId, // Pastikan user adalah pemilik order ini
      },
    });

    if (!order) {
      throw new NotFoundException(`Order dengan PayPal ID ${paypalOrderId} tidak ditemukan atau akses ditolak.`);
    }

    if (order.paymentStatus !== PaymentStatus.PENDING_PAYMENT) {
      throw new BadRequestException(`Order #${order.id} tidak sedang menunggu pembayaran.`);
    }
    
    if (!order.paymentMethodId) {
        throw new InternalServerErrorException(`Order #${order.id} tidak memiliki paymentMethodId.`);
    }

    const client = await this.getPayPalClient(order.paymentMethodId);
    const request = new paypal.orders.OrdersCaptureRequest(paypalOrderId);
    request.requestBody({});

    try {
      // 2. Lakukan permintaan 'capture' ke PayPal.
      const captureResponse = await client.execute(request);
      const captureResult = captureResponse.result;

      if (captureResult.status !== 'COMPLETED') {
        this.logger.error(`[PayPal] Capture untuk ${paypalOrderId} tidak selesai. Status: ${captureResult.status}`);
        // Opsional: Update status order menjadi FAILED
        await this.prisma.order.update({
            where: { id: order.id },
            data: { paymentStatus: PaymentStatus.FAILED }
        });
        throw new InternalServerErrorException('Pembayaran PayPal tidak dapat diselesaikan.');
      }

      this.logger.log(`[PayPal] Capture untuk ${paypalOrderId} SELESAI. Mengupdate order internal #${order.id}...`);

      // 3. Update order internal kita dengan status baru dan detail pembayaran.
      await this.prisma.order.update({
          where: { id: order.id },
          data: {
              paymentStatus: PaymentStatus.PAID,
              orderStatus: OrderStatus.PROCESSING,
              paymentDetails: captureResult as Prisma.JsonObject,
              paymentDueDate: null, // Pembayaran lunas, tidak ada lagi tanggal jatuh tempo.
          }
      });

      // 4. Ambil data order final yang sudah terupdate untuk dikembalikan ke user.
      return this.ordersService.findOne(order.id, userId);

    } catch (err) {
      let errorMessage = 'Gagal menangkap pembayaran';
      try {
        errorMessage = err.message ? JSON.parse(err.message) : 'Gagal menangkap pembayaran';
      } catch (parseError) {
        errorMessage = err.message || 'Terjadi kesalahan tak terduga saat proses pembayaran.';
      }
      this.logger.error(`[PayPal] Gagal menangkap pembayaran untuk ${paypalOrderId}:`, errorMessage);
      throw new InternalServerErrorException(errorMessage);
    }
  }

  // Fungsi webhook tidak berubah
  async handleWebhook(headers: any, body: any) {
    this.logger.log('[PayPal Webhook] Menerima event.');
    const paymentMethod = await this.prisma.paymentMethod.findFirst({ where: { code: 'paypal', isActive: true } });
    if (!paymentMethod) throw new InternalServerErrorException('Metode pembayaran PayPal aktif tidak ditemukan untuk verifikasi.');
    
    const webhookDto = plainToInstance(PaypalWebhookDto, body);
    const errors = await validate(webhookDto);
    if (errors.length > 0) {
      this.logger.error('[PayPal Webhook] Validasi payload gagal:', errors);
      throw new BadRequestException('Validasi payload webhook gagal.');
    }
    
    const { event_type: eventType, resource } = webhookDto;

    if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
      const paypalCaptureId = resource.id;

      const order = await this.prisma.order.findFirst({
        where: { paymentDetails: { path: ['id'], equals: paypalCaptureId } },
      });

      if (!order) {
        this.logger.warn(`[PayPal Webhook] Menerima capture completed untuk ${paypalCaptureId}, tapi tidak ada order yang cocok. Ini wajar jika panggilan API sudah memprosesnya.`);
        return { status: 'ignored_already_processed' };
      }

      if (order.paymentStatus === 'PAID') {
        this.logger.log(`[PayPal Webhook] Order #${order.id} sudah LUNAS. Tidak ada tindakan.`);
        return { status: 'ignored_already_paid' };
      }

      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.PAID,
          orderStatus: OrderStatus.PROCESSING,
        },
      });
      this.logger.log(`[PayPal Webhook] Mengkonfirmasi order internal #${order.id} menjadi LUNAS via webhook.`);
    } else {
        this.logger.log(`[PayPal Webhook] Tipe event tidak ditangani: ${eventType}.`);
    }

    return { status: 'processed' };
  }
}

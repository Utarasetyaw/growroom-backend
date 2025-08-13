// src/paypal/paypal.service.ts

import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as paypal from '@paypal/checkout-server-sdk';
import { PaymentStatus, OrderStatus, Prisma } from '@prisma/client';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PaypalWebhookDto } from './dto/paypal-webhook.dto';

@Injectable()
export class PaypalService {
  private readonly logger = new Logger(PaypalService.name);

  constructor(private prisma: PrismaService) {}

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
   * FUNGSI BARU: Membuat order di server PayPal berdasarkan data mentah.
   * Dipanggil oleh OrdersService SEBELUM order internal dibuat.
   * @param total - Total harga yang harus dibayar.
   * @param currencyCode - Kode mata uang (e.g., 'USD').
   * @param paymentMethodId - ID metode pembayaran untuk mengambil kredensial.
   * @param customReferenceId - ID kustom unik untuk pelacakan internal.
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
          value: total.toFixed(2), // Pastikan format 2 desimal
        },
      }],
    });

    try {
      const response = await client.execute(request);
      this.logger.log(`[PayPal] Order created with ID: ${response.result.id}`);
      // Kembalikan seluruh objek 'result'. OrdersService membutuhkan 'id' dari sini.
      return response.result;
    } catch (err) {
      const errorDetails = err.message ? JSON.parse(err.message) : 'Unknown PayPal Error';
      this.logger.error(`[PayPal] Failed to create order for ${customReferenceId}:`, errorDetails);
      throw new InternalServerErrorException({ message: 'Failed to create PayPal order.', details: errorDetails?.details });
    }
  }

  /**
   * REVISI: Menyelesaikan (capture) pembayaran.
   * Sekarang mencari order internal berdasarkan `paypalOrderId`.
   */
  async captureOrder(paypalOrderId: string) {
    this.logger.log(`[PayPal] Capturing payment for PayPal order ID: ${paypalOrderId}`);
    
    // Cari order internal kita berdasarkan paypalOrderId yang unik
    const internalOrder = await this.prisma.order.findUnique({
        where: { paypalOrderId },
        include: { paymentMethod: true }
    });

    if (!internalOrder) {
        this.logger.error(`[CRITICAL] Capture received for ${paypalOrderId}, but no matching internal order found!`);
        throw new NotFoundException('Capture cannot be linked to an internal order.');
    }
    
    if (internalOrder.paymentStatus === 'PAID') {
        throw new BadRequestException(`Order #${internalOrder.id} has already been paid.`);
    }

    if (!internalOrder.paymentMethod) {
        this.logger.error(`[PayPal] Internal order #${internalOrder.id} does not have a payment method associated.`);
        throw new InternalServerErrorException('Payment method not found for this order.');
    }

    const client = await this.getPayPalClient(internalOrder.paymentMethod.id);
    const request = new paypal.orders.OrdersCaptureRequest(paypalOrderId);
    request.requestBody({});

    try {
      const response = await client.execute(request);
      this.logger.log(`[DB] Updating internal order #${internalOrder.id} to PAID.`);
      
      await this.prisma.order.update({
        where: { id: internalOrder.id },
        data: {
          paymentStatus: PaymentStatus.PAID,
          orderStatus: OrderStatus.PROCESSING,
          paymentDetails: {
            paypalOrderId: response.result.id,
            captureId: response.result.purchase_units?.[0]?.payments?.captures?.[0]?.id,
            status: response.result.status,
            payer: response.result.payer,
          } as unknown as Prisma.InputJsonValue,
        },
      });

      return response.result;
    } catch (err) {
      const errorMessage = err.message ? JSON.parse(err.message) : 'Failed to capture payment';
      this.logger.error(`[PayPal] Failed to capture payment for ${paypalOrderId}:`, errorMessage);
      throw new InternalServerErrorException(errorMessage);
    }
  }

  /**
   * REVISI: Menangani notifikasi webhook dari PayPal.
   */
  async handleWebhook(headers: any, body: any) {
    this.logger.log('[PayPal Webhook] Received event.');
    const paymentMethod = await this.prisma.paymentMethod.findFirst({ where: { code: 'paypal', isActive: true } });
    if (!paymentMethod) throw new InternalServerErrorException('Active PayPal payment method not found for verification.');
    
    // Verifikasi signature webhook (logika ini sudah benar)
    // ... (kode verifikasi signature Anda di sini)

    // Validasi payload menggunakan DTO
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
        this.logger.warn(`[PayPal Webhook] Received capture completed for ${paypalCaptureId}, but no matching order found. It might have been updated by the capture API call.`);
        return { status: 'ignored_already_processed' };
      }

      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          paymentStatus: PaymentStatus.PAID,
          orderStatus: OrderStatus.PROCESSING,
        },
      });
      this.logger.log(`[PayPal Webhook] Confirmed internal order #${order.id} is PAID.`);
    } else {
        this.logger.log(`[PayPal Webhook] Unhandled event type: ${eventType}. Acknowledging.`);
    }

    return { status: 'processed' };
  }
}

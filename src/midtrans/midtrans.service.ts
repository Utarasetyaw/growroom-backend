import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class MidtransService {
  private readonly logger = new Logger(MidtransService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Menangani Notifikasi Pembayaran dari Midtrans (Webhook)
   * @param payload Data notifikasi dari Midtrans
   */
  async handlePaymentNotification(payload: any) {
    this.logger.log('[Midtrans Webhook] Received payment notification.');
    this.logger.debug(
      '[Midtrans Webhook] Payload:',
      JSON.stringify(payload, null, 2),
    );

    // 1. Ambil Order ID dari payload
    const orderIdString = payload.order_id?.replace('ORDER-', '');
    if (!orderIdString) {
      this.logger.error('[Midtrans Webhook] order_id is missing or invalid.');
      throw new BadRequestException('order_id is missing or in an invalid format');
    }

    const orderId = parseInt(orderIdString, 10);
    if (isNaN(orderId)) {
      this.logger.error(
        `[Midtrans Webhook] Invalid order_id format: ${orderIdString}`,
      );
      throw new BadRequestException('Invalid order_id format in notification');
    }

    this.logger.log(`[Midtrans Webhook] Processing for Order ID: ${orderId}`);

    // 2. Cari order di database
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { paymentMethod: true, orderItems: true },
    });

    if (!order) {
      this.logger.warn(
        `[Midtrans Webhook] Order #${orderId} not found. Acknowledging to stop retries.`,
      );
      return { message: `Order #${orderId} not found, but acknowledged.` };
    }

    if (order.paymentMethod?.code !== 'midtrans') {
      this.logger.warn(
        `[Midtrans Webhook] Order #${orderId} was not paid with Midtrans. Ignoring.`,
      );
      return { message: 'Not a Midtrans order, ignored.' };
    }

    // 3. Validasi Signature Key
    if (!order.paymentMethod.config) {
      this.logger.error(
        `[Midtrans Webhook] Payment config is missing for Order #${orderId}`,
      );
      throw new InternalServerErrorException('Payment configuration is missing');
    }
    
    const serverKey = order.paymentMethod.config['serverKey'] as string;
    if (!serverKey) {
      this.logger.error(
        `[Midtrans Webhook] Server key not configured for Order #${orderId}`,
      );
      throw new InternalServerErrorException('Server key not configured');
    }

    const signatureKey = crypto
      .createHash('sha512')
      .update(
        `${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`,
      )
      .digest('hex');

    if (signatureKey !== payload.signature_key) {
      this.logger.error(
        `[Midtrans Webhook] Invalid signature for Order #${orderId}`,
      );
      throw new ForbiddenException('Invalid signature');
    }
    this.logger.log(
      `[Midtrans Webhook] Signature is valid for Order #${orderId}.`,
    );

    // 4. Proses status transaksi
    let newPaymentStatus: PaymentStatus;
    let newOrderStatus: OrderStatus | undefined = undefined;
    const transactionStatus = payload.transaction_status;
    this.logger.log(`[Midtrans Webhook] Transaction status: ${transactionStatus}`);

    if (transactionStatus === 'settlement' || transactionStatus === 'capture') {
      newPaymentStatus = PaymentStatus.PAID;
    } else if (
      transactionStatus === 'cancel' ||
      transactionStatus === 'deny' ||
      transactionStatus === 'expire'
    ) {
      newPaymentStatus = PaymentStatus.CANCELLED;
      newOrderStatus = OrderStatus.CANCELLED;

      // Kembalikan stok jika pembayaran gagal/kedaluwarsa
      if (order.paymentStatus !== PaymentStatus.CANCELLED) {
        this.logger.log(
          `[Midtrans Webhook] Restoring stock for cancelled Order #${orderId}`,
        );
        for (const item of order.orderItems) {
          if (item.productId) {
            await this.prisma.product.update({
              where: { id: item.productId },
              data: { stock: { increment: item.qty } },
            });
          }
        }
      }
    } else {
      this.logger.log(
        `[Midtrans Webhook] Unhandled status (${transactionStatus}) for Order #${orderId}. No action taken.`,
      );
      return { message: 'Notification for pending status received, no action taken.' };
    }

    // 5. Update database jika ada perubahan
    if (order.paymentStatus !== newPaymentStatus) {
      await this.prisma.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: newPaymentStatus,
          ...(newOrderStatus && { orderStatus: newOrderStatus }),
        },
      });
      this.logger.log(
        `[Midtrans Webhook] SUCCESS: Order #${orderId} status updated. Payment: ${newPaymentStatus}, Order: ${newOrderStatus || order.orderStatus}.`,
      );
    } else {
      this.logger.log(
        `[Midtrans Webhook] Order #${orderId} status is already correct. No update needed.`,
      );
    }

    return { message: 'Payment notification processed successfully' };
  }
}
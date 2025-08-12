import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { MidtransNotificationDto } from './dto/midtrans-notification.dto';
import { OrderResponseDto } from '../orders/dto/order-response.dto';
import axios from 'axios';

@Injectable()
export class MidtransService {
  private readonly logger = new Logger(MidtransService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Membuat Transaksi Midtrans Snap.
   * Logika ini dipindahkan dari PaymentService yang lama.
   * @param order - Detail order yang akan diproses.
   */
  async createSnapTransaction(order: OrderResponseDto) {
    this.logger.log(`[Midtrans Snap] Creating transaction for Order ID: ORDER-${order.id}`);

    if (!order.paymentMethod?.id) {
      throw new InternalServerErrorException('Order payment method is missing or invalid.');
    }
    const paymentMethod = await this.prisma.paymentMethod.findUnique({
      where: { id: order.paymentMethod.id },
    });

    if (!paymentMethod) {
      throw new InternalServerErrorException('Payment method not found.');
    }
    
    const config = paymentMethod.config as any;
    if (!config?.serverKey) {
      throw new InternalServerErrorException('Midtrans Server Key is missing from config.');
    }

    const isProduction = config.mode === 'production';
    const midtransUrl = isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    const authString = Buffer.from(`${config.serverKey}:`).toString('base64');
    
    const finishUrl = config.frontendUrl;
    if (!finishUrl) {
      throw new InternalServerErrorException("Midtrans 'frontendUrl' is not configured in the database.");
    }

    const itemDetails = order.orderItems.map((item) => {
      const productName = (item.productName as any)?.en || (item.productName as any)?.id || 'Product';
      return {
        id: `PROD-${item.id}`,
        price: Math.round(item.price),
        quantity: item.qty,
        name: productName.substring(0, 50),
      };
    });

    if (order.shippingCost > 0) {
      itemDetails.push({
        id: 'SHIPPING',
        price: Math.round(order.shippingCost),
        quantity: 1,
        name: 'Shipping Cost',
      });
    }

    const payload = {
      transaction_details: {
        order_id: `ORDER-${order.id}`,
        gross_amount: Math.round(order.total),
      },
      item_details: itemDetails,
      customer_details: {
        first_name: order.user.name.split(' ')[0],
        last_name: order.user.name.split(' ').slice(1).join(' ') || order.user.name.split(' ')[0],
        email: order.user.email,
      },
      callbacks: {
        finish: finishUrl,
      },
    };
    
    try {
      const response = await axios.post(midtransUrl, payload, {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Basic ${authString}`,
        },
      });
      return {
        snapToken: response.data.token,
        redirectUrl: response.data.redirect_url,
      };
    } catch (err) {
      const errorData = err.response?.data;
      this.logger.error('[Midtrans Snap] Failed to create transaction:', errorData || err.message);
      throw new InternalServerErrorException(errorData?.error_messages || 'Failed to create Midtrans transaction');
    }
  }

  /**
   * Menangani Notifikasi Pembayaran dari Midtrans (Webhook)
   * @param payload Data notifikasi yang sudah divalidasi oleh DTO
   */
  async handlePaymentNotification(payload: MidtransNotificationDto) {
    this.logger.log(`[Midtrans Webhook] Processing notification for Order ID: ${payload.order_id}`);

    const serverKey = await this._getServerKeyForOrder(payload.order_id);
    if (!this._verifySignature(payload, serverKey)) {
      throw new ForbiddenException('Invalid signature');
    }
    this.logger.log(`[Midtrans Webhook] Signature is valid for Order ID: ${payload.order_id}.`);

    const order = await this.prisma.order.findUnique({
      where: { id: parseInt(payload.order_id.replace('ORDER-', ''), 10) },
      include: { orderItems: true },
    });

    if (!order) {
      this.logger.warn(`[Midtrans Webhook] Order for ${payload.order_id} not found. Acknowledging to stop retries.`);
      return { message: `Order for ${payload.order_id} not found, but acknowledged.` };
    }

    const finalStatuses: PaymentStatus[] = [PaymentStatus.PAID, PaymentStatus.CANCELLED, PaymentStatus.REFUND];
    if (finalStatuses.includes(order.paymentStatus)) {
      this.logger.log(`[Midtrans Webhook] Order ${payload.order_id} is already in a final state (${order.paymentStatus}). No action taken.`);
      return { message: 'Notification for an already finalized order received, no action taken.' };
    }

    return this._processTransactionStatus(order, payload);
  }

  /**
   * Memverifikasi signature dari payload webhook Midtrans.
   */
  private _verifySignature(payload: MidtransNotificationDto, serverKey: string): boolean {
    const signature = crypto
      .createHash('sha512')
      .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`)
      .digest('hex');
    return signature === payload.signature_key;
  }

  /**
   * Mendapatkan Server Key dari order terkait untuk verifikasi signature.
   */
  private async _getServerKeyForOrder(orderIdPayload: string): Promise<string> {
    const orderId = parseInt(orderIdPayload.replace('ORDER-', ''), 10);
    if (isNaN(orderId)) {
      throw new BadRequestException('Invalid order_id format in notification');
    }

    const paymentMethod = await this.prisma.paymentMethod.findFirst({
      where: { orders: { some: { id: orderId } }, code: 'midtrans' },
    });

    if (!paymentMethod?.config) {
      throw new InternalServerErrorException(`Payment configuration is missing for order related to ${orderIdPayload}`);
    }

    const serverKey = (paymentMethod.config as any).serverKey;
    if (!serverKey) {
      throw new InternalServerErrorException(`Server key not configured for order related to ${orderIdPayload}`);
    }

    return serverKey;
  }

  /**
   * Memproses status transaksi dan mengupdate database.
   */
  private async _processTransactionStatus(order: any, payload: MidtransNotificationDto) {
    const { transaction_status: transactionStatus, order_id } = payload;
    this.logger.log(`[Midtrans Webhook] Transaction status: ${transactionStatus}`);
    
    let updatePayload: Prisma.OrderUpdateInput = {};

    if (transactionStatus === 'settlement' || transactionStatus === 'capture') {
      updatePayload.paymentStatus = PaymentStatus.PAID;
    } else if (['cancel', 'deny', 'expire'].includes(transactionStatus)) {
      updatePayload = {
        paymentStatus: PaymentStatus.CANCELLED,
        orderStatus: OrderStatus.CANCELLED,
      };

      this.logger.log(`[Midtrans Webhook] Restoring stock for cancelled Order #${order.id}`);
      for (const item of order.orderItems) {
        if (item.productId) {
          await this.prisma.product.update({
            where: { id: item.productId },
            data: { stock: { increment: item.qty } },
          });
        }
      }
    } else {
      this.logger.log(`[Midtrans Webhook] Unhandled status (${transactionStatus}) for ${order_id}. No action taken.`);
      return { message: 'Notification for pending status received, no action taken.' };
    }
    
    await this.prisma.order.update({
      where: { id: order.id },
      data: updatePayload,
    });

    this.logger.log(`[Midtrans Webhook] SUCCESS: Order #${order.id} status updated.`);
    return { message: 'Payment notification processed successfully' };
  }
}

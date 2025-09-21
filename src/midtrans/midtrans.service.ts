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
import axios from 'axios';
import { DiscountsService } from '../discounts/discounts.service'; // <-- 1. IMPORT DISCOUNTS SERVICE

interface CustomerDetails {
  name: string;
  email: string;
}

interface ItemDetails {
  id: string;
  price: number;
  quantity: number;
  name: string;
}

@Injectable()
export class MidtransService {
  private readonly logger = new Logger(MidtransService.name);

  constructor(
    private prisma: PrismaService,
    private discountsService: DiscountsService, // <-- 2. INJECT DISCOUNTS SERVICE
  ) {}

  async createTransaction(
    generatedOrderId: string,
    total: number,
    items: ItemDetails[],
    customer: CustomerDetails,
    paymentMethodId: number,
  ) {
    this.logger.log(`[Midtrans] Creating transaction for generated Order ID: ${generatedOrderId}`);

    const paymentMethod = await this.prisma.paymentMethod.findUnique({
      where: { id: paymentMethodId },
    });

    if (!paymentMethod?.config) {
      throw new InternalServerErrorException('Midtrans configuration is not found.');
    }
    const config = paymentMethod.config as any;
    if (!config?.serverKey || !config?.frontendUrl) {
      throw new InternalServerErrorException('Midtrans Server Key or Frontend URL is missing from config.');
    }

    const isProduction = config.mode === 'production';
    const midtransUrl = isProduction
      ? 'https://app.midtrans.com/snap/v1/transactions'
      : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

    const authString = Buffer.from(`${config.serverKey}:`).toString('base64');

    const payload = {
      transaction_details: {
        order_id: generatedOrderId,
        gross_amount: Math.round(total),
      },
      item_details: items,
      customer_details: {
        first_name: customer.name.split(' ')[0],
        last_name: customer.name.split(' ').slice(1).join(' ') || customer.name.split(' ')[0],
        email: customer.email,
      },
      callbacks: {
        finish: config.frontendUrl,
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
      this.logger.error('[Midtrans] Failed to create transaction:', errorData || err.message);
      throw new InternalServerErrorException(errorData?.error_messages || 'Failed to create Midtrans transaction');
    }
  }

  async handlePaymentNotification(payload: MidtransNotificationDto) {
    this.logger.log(`[Midtrans Webhook] Processing notification for Order ID: ${payload.order_id}`);

    const serverKey = await this._getServerKeyForOrder(payload.order_id);
    if (!this._verifySignature(payload, serverKey)) {
      throw new ForbiddenException('Invalid signature');
    }
    this.logger.log(`[Midtrans Webhook] Signature is valid for Order ID: ${payload.order_id}.`);

    const order = await this.prisma.order.findUnique({
      where: { midtransOrderId: payload.order_id },
      include: { orderItems: true },
    });

    if (!order) {
      this.logger.warn(`[Midtrans Webhook] Order with midtransOrderId: ${payload.order_id} not found. Acknowledging to stop retries.`);
      return { message: `Order for ${payload.order_id} not found, but acknowledged.` };
    }

    const finalStatuses: PaymentStatus[] = [PaymentStatus.PAID, PaymentStatus.CANCELLED, PaymentStatus.REFUNDED];
    if (finalStatuses.includes(order.paymentStatus)) {
      this.logger.log(`[Midtrans Webhook] Order ${order.id} is already in a final state (${order.paymentStatus}). No action taken.`);
      return { message: 'Notification for an already finalized order received, no action taken.' };
    }

    return this._processTransactionStatus(order, payload);
  }

  private _verifySignature(payload: MidtransNotificationDto, serverKey: string): boolean {
    const signature = crypto
      .createHash('sha512')
      .update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`)
      .digest('hex');
    return signature === payload.signature_key;
  }

  private async _getServerKeyForOrder(midtransOrderId: string): Promise<string> {
    const order = await this.prisma.order.findUnique({
        where: { midtransOrderId },
        include: { paymentMethod: true }
    });

    if (!order?.paymentMethod?.config) {
      throw new InternalServerErrorException(`Payment configuration is missing for order with midtransOrderId: ${midtransOrderId}`);
    }

    const serverKey = (order.paymentMethod.config as any).serverKey;
    if (!serverKey) {
      throw new InternalServerErrorException(`Server key not configured for order with midtransOrderId: ${midtransOrderId}`);
    }

    return serverKey;
  }

  private async _processTransactionStatus(order: any, payload: MidtransNotificationDto) {
    const { transaction_status: transactionStatus, order_id } = payload;
    this.logger.log(`[Midtrans Webhook] Transaction status: ${transactionStatus} for order #${order.id}`);
    
    let updatePayload: Prisma.OrderUpdateInput = {};

    if (transactionStatus === 'settlement' || transactionStatus === 'capture') {
      updatePayload.paymentStatus = PaymentStatus.PAID;
      updatePayload.orderStatus = OrderStatus.PROCESSING;
      
      await this.prisma.order.update({
        where: { id: order.id },
        data: updatePayload,
      });

      // --- 3. PANGGIL METHOD UNTUK MENANDAI VOUCHER SETELAH PEMBAYARAN SUKSES ---
      await this.discountsService.markVoucherAsUsedForOrder(order.id, order.userId);

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

      await this.prisma.order.update({
        where: { id: order.id },
        data: updatePayload,
      });

    } else {
      this.logger.log(`[Midtrans Webhook] Unhandled status (${transactionStatus}) for ${order_id}. No action taken.`);
      return { message: 'Notification for pending status received, no action taken.' };
    }
    
    this.logger.log(`[Midtrans Webhook] SUCCESS: Order #${order.id} status updated.`);
    return { message: 'Payment notification processed successfully' };
  }
}
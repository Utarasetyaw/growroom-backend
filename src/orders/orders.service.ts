// src/orders/orders.service.ts

import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PaymentService } from '../payment/payment.service';
import { sendTelegramMessage } from '../utils/telegram.util';

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService
  ) {}

  // Create Order
  async create(userId: number, dto: CreateOrderDto) {
    // Validate payment method
    const paymentMethod = await this.prisma.paymentMethod.findUnique({
      where: { id: dto.paymentMethodId }
    });
    if (!paymentMethod || !paymentMethod.isActive)
      throw new BadRequestException('Invalid or disabled payment method');

    // Parse config (always as object)
    let config: any = paymentMethod.config;
    if (!config || typeof config !== 'object') {
      try {
        config = JSON.parse(paymentMethod.config as string);
      } catch {
        config = {};
      }
    }

    // Create order (status always pending)
    const order = await this.prisma.order.create({
      data: {
        userId,
        address: dto.address,
        shippingCost: dto.shippingCost,
        subtotal: dto.subtotal,
        total: dto.total,
        paymentStatus: 'PENDING',
        orderStatus: 'PROCESSING',
        paymentMethodId: dto.paymentMethodId,
        orderItems: {
          create: dto.orderItems.map(item => ({
            productId: item.productId,
            price: item.price,
            qty: item.qty,
            subtotal: item.price * item.qty,
          })),
        }
      },
      include: { orderItems: true, paymentMethod: true }
    });

    // --- Kirim Notifikasi Telegram ke Owner ---
    const setting = await this.prisma.generalSetting.findUnique({ where: { id: 1 } });
    if (setting?.telegramBotToken && setting?.telegramChatId) {
      const totalIDR = order.total?.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' }) || order.total;
      const itemsText = order.orderItems.map(
        (item, idx) =>
          `${idx + 1}. ${item.productId} x${item.qty} @${item.price.toLocaleString('id-ID')}`
      ).join('\n');
      const text =
        `🛒 *Order Baru #${order.id}*\n` +
        `👤 User ID: ${order.userId}\n` +
        `🏠 Alamat: ${order.address}\n` +
        `📦 Barang:\n${itemsText}\n` +
        `💰 Subtotal: ${order.subtotal?.toLocaleString('id-ID')}\n` +
        `🚚 Ongkir: ${order.shippingCost?.toLocaleString('id-ID')}\n` +
        `💸 Total: *${totalIDR}*\n` +
        `🔗 Metode: ${order.paymentMethod?.name || '-'}\n` +
        `[Glowroom Admin Panel]`;
      sendTelegramMessage(setting.telegramBotToken, setting.telegramChatId, text);
    }

    // === PAYMENT RESPONSE HANDLING ===

    // A. BANK TRANSFER (manual, manual konfirmasi)
    if (paymentMethod.code === 'bank_transfer') {
      return {
        ...order,
        paymentType: 'BANK_TRANSFER',
        instructions: {
          bank: config.bank,
          accountNumber: config.accountNumber,
          accountHolder: config.accountHolder,
          note: 'Transfer sesuai total ke rekening di atas lalu konfirmasi pembayaran.'
        }
      };
    }

    // B. MIDTRANS
    if (paymentMethod.code === 'midtrans') {
      // Call service helper to create snap token
      const snap = await this.paymentService.createMidtransTransaction(order, paymentMethod);
      return {
        ...order,
        paymentType: 'MIDTRANS',
        snapToken: snap.snapToken,
        redirectUrl: snap.redirectUrl
      };
    }

    // C. PAYPAL
    if (paymentMethod.code === 'paypal') {
      // Call service helper to create approval url
      const paypal = await this.paymentService.createPaypalTransaction(order, paymentMethod);
      return {
        ...order,
        paymentType: 'PAYPAL',
        approvalUrl: paypal.approvalUrl
      };
    }

    // D. Fallback (generic payment)
    return order;
  }

  // List all orders (owner/admin)
  async findAll() {
    return this.prisma.order.findMany({
      include: { user: true, orderItems: { include: { product: true } }, paymentMethod: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  // List user order (for user)
  async findUserOrders(userId: number) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { orderItems: { include: { product: true } }, paymentMethod: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Detail one order (user: only own, admin/owner: any)
  async findOne(id: number, userId?: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { user: true, orderItems: { include: { product: true } }, paymentMethod: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (userId && order.userId !== userId) throw new ForbiddenException('Forbidden');
    return order;
  }

  // Update order status (only by owner/admin)
  async update(id: number, dto: UpdateOrderDto) {
    return this.prisma.order.update({
      where: { id },
      data: dto
    });
  }
}

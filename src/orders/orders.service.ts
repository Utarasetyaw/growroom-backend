// src/orders/orders.service.ts

import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PaymentService } from '../payment/payment.service';
import { sendTelegramMessage } from '../utils/telegram.util';
import * as PDFDocument from 'pdfkit';

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
  async generateInvoicePdf(orderId: number, userId?: number): Promise<Buffer> {
    // Ambil order
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: true,
        orderItems: { include: { product: true } },
        paymentMethod: true,
      }
    });
    if (!order) throw new NotFoundException('Order not found');
    if (userId && order.userId !== userId) throw new ForbiddenException('Forbidden');

    // Invoice Generator
    const doc = new PDFDocument({ margin: 40 });
    const buffers: Buffer[] = [];
    doc.on('data', d => buffers.push(d));
    doc.on('end', () => {});

    // HEADER
    doc.fontSize(16).text('INVOICE', { align: 'center', underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Order ID: #${order.id}    |    Date: ${order.createdAt.toLocaleString('id-ID')}`);
    doc.moveDown(0.5);
    doc.text(`Customer: ${order.user?.name || order.userId} (${order.user?.email || '-'})`);
    doc.text(`Alamat: ${order.address}`);
    doc.moveDown(0.5);

    // TABEL BARANG
    doc.fontSize(12).text('Detail Barang', { underline: true });
    doc.moveDown(0.5);
    // Header Table
    doc.fontSize(10)
      .text('No', 40, doc.y, { continued: true })
      .text('Nama Barang', 80, doc.y, { continued: true })
      .text('Qty', 270, doc.y, { continued: true })
      .text('Harga', 320, doc.y, { continued: true })
      .text('Subtotal', 400, doc.y);
    doc.moveDown(0.2);
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();

    // Items
    order.orderItems.forEach((item, idx) => {
      let name = '-';
      if (item.product?.name) {
        if (typeof item.product.name === 'object') {
          // Handle object case - try to get id property if it exists or first value
          const nameObj = item.product.name as Record<string, any>;
          name = nameObj.id || 
                (Object.keys(nameObj).length > 0 ? String(nameObj[Object.keys(nameObj)[0]]) : '-');
        } else {
          // Handle string or other primitive case
          name = String(item.product.name);
        }
      }
      doc.fontSize(10)
        .text(`${idx + 1}`, 40, doc.y, { continued: true })
        .text(`${name}`, 80, doc.y, { continued: true })
        .text(`${item.qty}`, 270, doc.y, { continued: true })
        .text(`${item.price.toLocaleString('id-ID')}`, 320, doc.y, { continued: true })
        .text(`${item.subtotal.toLocaleString('id-ID')}`, 400, doc.y);
      doc.moveDown(0.2);
    });

    doc.moveDown(0.2);
    doc.moveTo(40, doc.y).lineTo(550, doc.y).stroke();

    // Total & Footer
    doc.moveDown(0.5);
    doc.fontSize(11).text(`Subtotal: Rp${order.subtotal.toLocaleString('id-ID')}`, { align: 'right' });
    doc.text(`Ongkir: Rp${order.shippingCost.toLocaleString('id-ID')}`, { align: 'right' });
    doc.font('Helvetica-Bold').text(`TOTAL: Rp${order.total.toLocaleString('id-ID')}`, { align: 'right' }).font('Helvetica');
    doc.moveDown(0.7);

    doc.text(`Metode Bayar: ${order.paymentMethod?.name || '-'}`, { align: 'right' });
    doc.moveDown(0.7);
    doc.fontSize(10).text('Terima kasih sudah belanja di GlowRoom!', { align: 'center' });

    doc.end();
    await new Promise(res => doc.on('end', res));
    return Buffer.concat(buffers);
  }
}

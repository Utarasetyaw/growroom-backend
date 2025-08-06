import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PaymentService } from '../payment/payment.service';
import { sendTelegramMessage } from '../utils/telegram.util';
import * as PDFDocument from 'pdfkit';
import { Prisma } from '@prisma/client';

// PERBAIKAN DI SINI:
const mapOrderToDto = (
  order: Prisma.OrderGetPayload<{
    include: {
      user: true;
      orderItems: { include: { product: true } }; // Tetap include product untuk mendapatkan ID-nya jika ada
      paymentMethod: true;
    };
  }>,
) => {
  if (!order) return null;

  return {
    ...order,
    orderItems: order.orderItems.map((item) => ({
      ...item,
      // Logika yang benar: bangun object 'product' dari data snapshot di 'item'
      product: {
        id: item.product?.id,      // Ambil ID dari relasi jika masih ada
        name: item.productName,    // Ambil nama dari snapshot
        variant: item.productVariant, // Ambil varian dari snapshot
        image: item.productImage,     // Ambil gambar dari snapshot
      },
    })),
  };
};

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,
  ) {}

  async create(userId: number, dto: CreateOrderDto) {
    const paymentMethod = await this.prisma.paymentMethod.findUnique({
      where: { id: dto.paymentMethodId },
    });
    if (!paymentMethod || !paymentMethod.isActive) {
      throw new BadRequestException('Invalid or disabled payment method');
    }

    const productIds = dto.orderItems.map((item) => item.productId);
    const productsInOrder = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
        isActive: true,
      },
      include: { images: { take: 1, orderBy: { id: 'asc' } } },
    });

    const productMap = new Map(productsInOrder.map((p) => [p.id, p]));

    if (productMap.size !== productIds.length) {
      throw new BadRequestException('One or more products are not found or inactive.');
    }

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
          create: dto.orderItems.map((item) => {
            const product = productMap.get(item.productId);
            if (!product || product.stock < item.qty) {
              throw new BadRequestException(
                `Insufficient stock for product ID ${item.productId}.`,
              );
            }
            
            return {
              productId: item.productId,
              productName: product.name ?? Prisma.JsonNull,
              productVariant: product.variant ?? Prisma.JsonNull,
              productImage:
                product.images.length > 0 ? product.images[0].url : null,
              price: item.price,
              qty: item.qty,
              subtotal: item.price * item.qty,
            };
          }),
        },
      },
      include: {
        user: true,
        orderItems: { include: { product: true } },
        paymentMethod: true
      },
    });
    
    const mappedOrder = mapOrderToDto(order);

    const setting = await this.prisma.generalSetting.findUnique({ where: { id: 1 } });
    if (setting?.telegramBotToken && setting?.telegramChatId && mappedOrder) {
        const totalIDR = mappedOrder.total?.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' }) || mappedOrder.total;
        const itemsText = mappedOrder.orderItems.map((item, idx) => {
            const name = (item.product.name as any)?.id || (item.product.name as any)?.en || 'N/A';
            return `${idx + 1}. ${name} x${item.qty} @${item.price.toLocaleString('id-ID')}`;
        }).join('\n');
        const text =
            `🛒 *Order Baru #${mappedOrder.id}*\n` +
            `👤 User: ${mappedOrder.user.name}\n` +
            `🏠 Alamat: ${mappedOrder.address}\n` +
            `📦 Barang:\n${itemsText}\n` +
            `💰 Subtotal: ${mappedOrder.subtotal?.toLocaleString('id-ID')}\n` +
            `🚚 Ongkir: ${mappedOrder.shippingCost?.toLocaleString('id-ID')}\n` +
            `💸 Total: *${totalIDR}*\n` +
            `🔗 Metode: ${mappedOrder.paymentMethod?.name || '-'}\n` +
            `[Glowroom Admin Panel]`;
        sendTelegramMessage(setting.telegramBotToken, setting.telegramChatId, text);
    }
    
    if (paymentMethod.code === 'midtrans') {
      const snap = await this.paymentService.createMidtransTransaction(order, paymentMethod);
      return { ...mappedOrder, paymentType: 'MIDTRANS', snapToken: snap.snapToken, redirectUrl: snap.redirectUrl };
    }
    
    return mappedOrder;
  }

  async findAll() {
    const orders = await this.prisma.order.findMany({
      include: {
        user: true,
        orderItems: { include: { product: true } },
        paymentMethod: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map(mapOrderToDto);
  }

  async findUserOrders(userId: number) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: {
        user: true,
        orderItems: { include: { product: true } },
        paymentMethod: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map(mapOrderToDto);
  }

  async findOne(id: number, userId?: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        orderItems: { include: { product: true } },
        paymentMethod: true,
      },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (userId && order.userId !== userId) {
      throw new ForbiddenException('Forbidden');
    }

    return mapOrderToDto(order);
  }

  async update(id: number, dto: UpdateOrderDto) {
    await this.prisma.order.update({
      where: { id },
      data: dto,
    });
    return this.findOne(id);
  }

  async generateInvoicePdf(
    orderId: number,
    userId?: number,
  ): Promise<Buffer> {
    const order = await this.findOne(orderId, userId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const buffers: Buffer[] = [];
    doc.on('data', (d) => buffers.push(d));

    doc.fontSize(16).text('INVOICE', { align: 'center', underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(
      `Order ID: #${order.id}    |    Date: ${order.createdAt.toLocaleDateString(
        'id-ID',
      )}`,
    );
    doc.moveDown(0.5);
    doc.text(
      `Customer: ${order.user?.name || order.userId} (${
        order.user?.email || '-'
      })`,
    );
    doc.text(`Address: ${order.address}`);
    doc.moveDown();

    const tableTop = doc.y;
    doc.fontSize(11).font('Helvetica-Bold');
    doc.text('Product', 50, tableTop);
    doc.text('Qty', 300, tableTop);
    doc.text('Price', 370, tableTop, { width: 90, align: 'right' });
    doc.text('Subtotal', 460, tableTop, { width: 90, align: 'right' });
    doc.font('Helvetica');
    doc.moveTo(40, doc.y).lineTo(560, doc.y).stroke().moveDown();
    
    order.orderItems.forEach((item) => {
        const itemY = doc.y;
        const name = (item.product.name as any)?.id || (item.product.name as any)?.en || 'Product Deleted';
        
        doc.text(name, 50, itemY, { width: 240 });
        doc.text(item.qty.toString(), 300, itemY);
        doc.text(item.price.toLocaleString('id-ID'), 370, itemY, { width: 90, align: 'right' });
        doc.text(item.subtotal.toLocaleString('id-ID'), 460, itemY, { width: 90, align: 'right' });
        doc.moveDown();
    });

    doc.moveTo(40, doc.y).lineTo(560, doc.y).stroke().moveDown();

    let summaryY = doc.y;
    doc.text('Subtotal', 370, summaryY, { width: 90 });
    doc.text(`Rp${order.subtotal.toLocaleString('id-ID')}`, 460, summaryY, { width: 90, align: 'right' });
    summaryY += 15;
    doc.text('Shipping', 370, summaryY, { width: 90 });
    doc.text(`Rp${order.shippingCost.toLocaleString('id-ID')}`, 460, summaryY, { width: 90, align: 'right' });
    summaryY += 20;

    doc.font('Helvetica-Bold');
    doc.text('TOTAL', 370, summaryY, { width: 90 });
    doc.text(`Rp${order.total.toLocaleString('id-ID')}`, 460, summaryY, { width: 90, align: 'right' });
    doc.font('Helvetica');
    doc.moveDown(2);

    doc.text(`Payment Method: ${order.paymentMethod?.name || '-'}`, { align: 'right' });
    doc.text(`Payment Status: ${order.paymentStatus}`, { align: 'right' });
    
    doc.end();
    return new Promise((resolve) => {
        doc.on('end', () => resolve(Buffer.concat(buffers)));
    });
  }
}
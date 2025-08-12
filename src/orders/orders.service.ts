import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CartService } from '../cart/cart.service';
import { sendTelegramMessage } from '../utils/telegram.util';
import * as PDFDocument from 'pdfkit';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderResponseDto } from './dto/order-response.dto';
// --- 1. Impor Service Baru ---
import { MidtransService } from '../midtrans/midtrans.service';
import { PaypalService } from '../paypal/paypal.service';

type OrderWithDetails = Prisma.OrderGetPayload<{
  include: {
    user: true;
    orderItems: { include: { product: true } };
    paymentMethod: true;
  };
}>;

const mapOrderToDto = (order: OrderWithDetails | null): OrderResponseDto | null => {
  if (!order) return null;
  return {
    ...order,
    currencyCode: order.currencyCode,
    paymentDueDate: order.paymentDueDate ?? undefined,
    orderItems: order.orderItems.map((item) => ({
      ...item,
      productName: item.productName,
      productVariant: item.productVariant,
      productImage: item.productImage ?? undefined,
      product: item.product
        ? {
            id: item.product.id,
            name: item.product.name,
          }
        : {
            id: item.productId ?? 0,
            name: item.productName,
          },
    })),
    paymentMethod: order.paymentMethod ? {
      id: order.paymentMethod.id,
      name: order.paymentMethod.name,
      code: order.paymentMethod.code,
      config: order.paymentMethod.config,
    } : undefined,
    user: {
      id: order.user.id,
      name: order.user.name,
      email: order.user.email,
    },
  };
};

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  // --- 2. Ganti Dependency Injection di Constructor ---
  constructor(
    private prisma: PrismaService,
    private cartService: CartService,
    private midtransService: MidtransService, // Hapus PaymentService
    private paypalService: PaypalService,   // Tambahkan service baru
  ) {}

  async create(userId: number, dto: CreateOrderDto) {
    // ... (Logika awal untuk membuat data order di DB tidak berubah)
    const {
      orderItems,
      paymentMethodId,
      shippingRateId,
      address,
    } = dto;
    if (!orderItems || orderItems.length === 0) {
      throw new BadRequestException('Order items cannot be empty.');
    }

    const transactionResult = await this.prisma.$transaction(async (tx) => {
      const paymentMethod = await tx.paymentMethod.findUnique({
        where: { id: paymentMethodId },
      });
      if (!paymentMethod || !paymentMethod.isActive) {
        throw new BadRequestException('Invalid or disabled payment method');
      }

      const productIds = orderItems.map((item) => item.productId);
      const productsFromDb = await tx.product.findMany({
        where: { id: { in: productIds }, isActive: true },
        include: {
          prices: { where: { currency: { code: dto.currencyCode } } },
          images: { take: 1, orderBy: { id: 'asc' } },
        },
      });
      const productMap = new Map(productsFromDb.map((p) => [p.id, p]));

      let subtotal = 0;
      for (const item of orderItems) {
        const product = productMap.get(item.productId);
        if (!product) throw new BadRequestException(`Product with ID ${item.productId} not found.`);
        const productNameForError = (product.name as any)?.en || 'Unknown Product';
        if (product.stock < item.qty) throw new BadRequestException(`Insufficient stock for product ${productNameForError}.`);
        const priceInfo = product.prices[0];
        if (!priceInfo) throw new BadRequestException(`Price in ${dto.currencyCode} not found for product ${productNameForError}.`);
        subtotal += priceInfo.price * item.qty;
      }

      let shippingCost = 0;
      if (shippingRateId) {
        const rate = await tx.shippingRate.findUnique({
          where: { id: shippingRateId },
          include: { prices: { where: { currency: { code: dto.currencyCode } } } },
        });
        if (!rate || !rate.prices[0]) throw new BadRequestException(`Invalid shipping rate for currency ${dto.currencyCode}.`);
        shippingCost = rate.prices[0].price;
      }

      const total = subtotal + shippingCost;
      const paymentDueDate = new Date();
      paymentDueDate.setDate(paymentDueDate.getDate() + 2);

      for (const item of orderItems) {
        if (item.productId) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stock: { decrement: item.qty } },
          });
        }
      }

      const order = await tx.order.create({
        data: {
          userId,
          address,
          shippingCost,
          subtotal,
          total,
          paymentStatus: 'PENDING',
          orderStatus: 'PROCESSING',
          paymentMethodId,
          paymentDueDate,
          currencyCode: dto.currencyCode,
          orderItems: {
            create: orderItems.map((item) => {
              const product = productMap.get(item.productId);
              if (!product) throw new InternalServerErrorException('Product data inconsistency.');
              const priceInfo = product.prices[0];
              return {
                productId: item.productId,
                productName: product.name ?? Prisma.JsonNull,
                productVariant: product.variant ?? Prisma.JsonNull,
                productImage: product.images.length > 0 ? product.images[0].url : null,
                price: priceInfo.price,
                qty: item.qty,
                subtotal: priceInfo.price * item.qty,
              };
            }),
          },
        },
        include: { user: true, orderItems: { include: { product: true } }, paymentMethod: true },
      });

      await this.cartService.clearCart(userId);
      return { order, paymentMethod };
    });

    const { order, paymentMethod } = transactionResult;
    await this._sendTelegramNotification(order);
    const mappedOrder = mapOrderToDto(order);
    if (!mappedOrder || !mappedOrder.paymentMethod) {
      throw new InternalServerErrorException('Failed to map created order or its payment method.');
    }

    // --- 3. Ganti Logika Pemanggilan Service Pembayaran ---
    if (paymentMethod.code === 'midtrans') {
      const snap = await this.midtransService.createSnapTransaction(
        mappedOrder as OrderResponseDto,
      );
      return { ...mappedOrder, paymentType: 'MIDTRANS', ...snap };
    }

    if (paymentMethod.code === 'paypal') {
      // NOTE: Ini untuk alur redirect standar (tombol bayar PayPal)
      const paypalData = await this.paypalService.createRedirectTransaction(
        mappedOrder as OrderResponseDto,
      );
      return { ...mappedOrder, paymentType: 'PAYPAL_REDIRECT', ...paypalData };
    }
    
    if (['bank_transfer', 'wise'].includes(paymentMethod.code)) {
      const configObject = typeof paymentMethod.config === 'object' && paymentMethod.config !== null ? paymentMethod.config : {};
      const instructions = { ...configObject, amount: order.total, paymentDueDate: order.paymentDueDate };
      return { ...mappedOrder, paymentType: 'MANUAL', instructions };
    }

    return mappedOrder;
  }

  // ... (Method _sendTelegramNotification, findAll, findUserOrders, update, generateInvoicePdf tidak berubah)
  private async _sendTelegramNotification(order: OrderWithDetails): Promise<void> {
    this.logger.log(`[Telegram] Memulai proses notifikasi untuk Order #${order.id}...`);
    const setting = await this.prisma.generalSetting.findUnique({ where: { id: 1 } });
    if (!setting?.telegramBotToken || !setting?.telegramChatId) {
      this.logger.error(`[Telegram] Proses dihentikan: Bot Token atau Chat ID tidak ditemukan.`);
      return;
    }
    const totalFormatted = order.total.toLocaleString('id-ID', { style: 'currency', currency: order.currencyCode });
    const dashboardUrl = `${process.env.DASHBOARD_URL || 'http://localhost:3000'}/orders/${order.id}`;
    const text = `
🛒 *Pesanan Baru Diterima: #${order.id}*
*Pelanggan:* ${order.user.name} (\`${order.user.email}\`)
*Total:* *${totalFormatted}*
*Metode:* ${order.paymentMethod?.name || 'N/A'}
[Lihat Detail di Dashboard](${dashboardUrl})
    `;
    this.logger.log(`[Telegram] Mengirim notifikasi untuk Order #${order.id}...`);
    sendTelegramMessage(setting.telegramBotToken, setting.telegramChatId, text);
  }

  async findAll(options: { page: number; limit: number }) {
    const { page, limit } = options;
    const skip = (page - 1) * limit;
    const [orders, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        skip,
        take: limit,
        include: { user: true, orderItems: { include: { product: true } }, paymentMethod: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count(),
    ]);
    return { data: orders.map(mapOrderToDto), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findUserOrders(userId: number) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: { user: true, orderItems: { include: { product: true } }, paymentMethod: true },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map(mapOrderToDto);
  }

  async findOne(id: number, userId?: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { user: true, orderItems: { include: { product: true } }, paymentMethod: true },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (userId && order.userId !== userId) throw new ForbiddenException('Forbidden');
    return mapOrderToDto(order);
  }

  async update(id: number, dto: UpdateOrderDto) {
    const { paymentStatus, orderStatus, trackingNumber } = dto;
    const existingOrder = await this.prisma.order.findUnique({ where: { id }, include: { orderItems: true } });
    if (!existingOrder) throw new NotFoundException('Order not found');
    const isStatusChangingToCancelled = existingOrder.orderStatus !== OrderStatus.CANCELLED && orderStatus === OrderStatus.CANCELLED;
    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({ where: { id }, data: { paymentStatus, orderStatus, trackingNumber } });
      if (isStatusChangingToCancelled) {
        for (const item of existingOrder.orderItems) {
          if (item.productId) {
            await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.qty } } });
          }
        }
      }
    });
    return this.findOne(id);
  }

  async generateInvoicePdf(orderId: number, userId?: number): Promise<Buffer> {
    const order = await this.findOne(orderId, userId);
    if (!order) throw new NotFoundException('Order not found');
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const buffers: Buffer[] = [];
    doc.on('data', (d) => buffers.push(d));
    doc.fontSize(16).text('INVOICE', { align: 'center', underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Order ID: #${order.id}    |    Date: ${order.createdAt.toLocaleDateString('id-ID')}`);
    doc.moveDown(0.5);
    doc.text(`Customer: ${order.user?.name || 'N/A'} (${order.user?.email || '-'})`);
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
      const name = (item.productName as any)?.id || (item.productName as any)?.en || 'Product Deleted';
      doc.text(name, 50, itemY, { width: 240 });
      doc.text(item.qty.toString(), 300, itemY);
      doc.text(item.price.toLocaleString('id-ID', { style: 'currency', currency: order.currencyCode }), 370, itemY, { width: 90, align: 'right' });
      doc.text(item.subtotal.toLocaleString('id-ID', { style: 'currency', currency: order.currencyCode }), 460, itemY, { width: 90, align: 'right' });
      doc.moveDown();
    });
    doc.moveTo(40, doc.y).lineTo(560, doc.y).stroke().moveDown();
    let summaryY = doc.y;
    doc.text('Subtotal', 370, summaryY, { width: 90 });
    doc.text(order.subtotal.toLocaleString('id-ID', { style: 'currency', currency: order.currencyCode }), 460, summaryY, { width: 90, align: 'right' });
    summaryY += 15;
    doc.text('Shipping', 370, summaryY, { width: 90 });
    doc.text(order.shippingCost.toLocaleString('id-ID', { style: 'currency', currency: order.currencyCode }), 460, summaryY, { width: 90, align: 'right' });
    summaryY += 20;
    doc.font('Helvetica-Bold');
    doc.text('TOTAL', 370, summaryY, { width: 90 });
    doc.text(order.total.toLocaleString('id-ID', { style: 'currency', currency: order.currencyCode }), 460, summaryY, { width: 90, align: 'right' });
    doc.font('Helvetica');
    doc.moveDown(2);
    doc.text(`Payment Method: ${order.paymentMethod?.name || '-'}`, { align: 'right' });
    doc.text(`Payment Status: ${order.paymentStatus}`, { align: 'right' });
    doc.end();
    return new Promise((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(buffers)));
    });
  }

  async retryPayment(orderId: number, userId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId, userId },
      include: { user: true, paymentMethod: true, orderItems: { include: { product: true } } },
    });

    if (!order) {
      throw new NotFoundException('Order not found or not owned by user.');
    }
    if (order.paymentStatus !== 'PENDING') {
      throw new BadRequestException('Payment can only be retried for orders with PENDING status.');
    }

    const mappedOrder = mapOrderToDto(order);
    if (!mappedOrder || !mappedOrder.paymentMethod) {
      throw new InternalServerErrorException('Failed to map order data or its payment method.');
    }

    // --- 4. Ganti Logika Pemanggilan Service Pembayaran ---
    if (mappedOrder.paymentMethod.code === 'midtrans') {
      const snap = await this.midtransService.createSnapTransaction(
        mappedOrder as OrderResponseDto,
      );
      return { paymentType: 'MIDTRANS', ...snap };
    }

    if (mappedOrder.paymentMethod.code === 'paypal') {
      const paypalData = await this.paypalService.createRedirectTransaction(
        mappedOrder as OrderResponseDto,
      );
      return { paymentType: 'PAYPAL_REDIRECT', ...paypalData };
    }

    if (['bank_transfer', 'wise'].includes(mappedOrder.paymentMethod.code)) {
      const configObject = typeof mappedOrder.paymentMethod.config === 'object' && mappedOrder.paymentMethod.config !== null ? mappedOrder.paymentMethod.config : {};
      const instructions = { ...configObject, amount: mappedOrder.total, paymentDueDate: mappedOrder.paymentDueDate };
      return { ...mappedOrder, paymentType: 'MANUAL', instructions };
    }

    throw new BadRequestException('Payment method is not supported for retry payment.');
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredOrders() {
    this.logger.log('Running cron job to check for expired orders...');
    const expiredOrders = await this.prisma.order.findMany({
      where: { paymentStatus: PaymentStatus.PENDING, paymentDueDate: { lt: new Date() } },
      include: { orderItems: true },
    });

    if (expiredOrders.length > 0) {
      this.logger.log(`Found ${expiredOrders.length} expired orders. Processing...`);
      for (const order of expiredOrders) {
        await this.prisma.$transaction(async (tx) => {
          await tx.order.update({ where: { id: order.id }, data: { paymentStatus: PaymentStatus.CANCELLED, orderStatus: OrderStatus.CANCELLED } });
          for (const item of order.orderItems) {
            if (item.productId) {
              await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.qty } } });
            }
          }
        });
        this.logger.log(`Order #${order.id} expired. Status updated to CANCELLED and stock returned.`);
      }
    } else {
      this.logger.log('No expired orders found.');
    }
  }
}

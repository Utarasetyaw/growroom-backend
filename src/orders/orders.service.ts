// src/orders/orders.service.ts

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
import { OrderStatus, PaymentStatus, Prisma, User, Product } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderResponseDto } from './dto/order-response.dto';
import { MidtransService } from '../midtrans/midtrans.service';
import { PaypalService } from '../paypal/paypal.service';

// Definisikan tipe data untuk kejelasan
type OrderWithDetails = Prisma.OrderGetPayload<{
  include: {
    user: true;
    orderItems: { include: { product: true } };
    paymentMethod: true;
  };
}>;

// Tipe data untuk hasil kalkulasi
interface CalculatedTotals {
  subtotal: number;
  shippingCost: number;
  total: number;
  productMap: Map<number, Product & { prices: any[], images: any[] }>;
}

// Tipe data untuk menyimpan order
interface SaveOrderPayload {
    userId: number;
    address: string;
    shippingCost: number;
    subtotal: number;
    total: number;
    paymentMethodId: number;
    currencyCode: string;
    orderItems: any[];
    productMap: Map<number, any>;
    midtransOrderId?: string;
    paypalOrderId?: string;
}


@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private cartService: CartService,
    private midtransService: MidtransService,
    private paypalService: PaypalService,
  ) {}

  /**
   * Metode utama untuk membuat order.
   * Alur: Kalkulasi -> Inisiasi Gateway -> Simpan ke DB.
   */
  async create(userId: number, dto: CreateOrderDto) {
    const { paymentMethodId } = dto;

    const [paymentMethod, user] = await Promise.all([
        this.prisma.paymentMethod.findUnique({ where: { id: paymentMethodId } }),
        this.prisma.user.findUnique({ where: { id: userId } })
    ]);
    
    if (!paymentMethod || !paymentMethod.isActive) {
      throw new BadRequestException('Invalid or disabled payment method');
    }
    if (!user) {
        throw new NotFoundException('User not found.');
    }

    // Langkah 1: Kalkulasi semua total dan validasi data produk
    const totals = await this._calculateTotals(dto);

    // Langkah 2: Proses berdasarkan metode pembayaran
    let paymentResponse: any;
    let orderData: Partial<SaveOrderPayload> = {};

    switch (paymentMethod.code) {
      case 'midtrans':
        const orderIdForMidtrans = `ORDER-${userId}-${Date.now()}`;
        
        const itemDetailsForMidtrans = dto.orderItems.map(item => {
            const product = totals.productMap.get(item.productId);
            if (!product) {
                throw new BadRequestException(`Product with ID ${item.productId} not found or inactive.`);
            }
            const priceInfo = product.prices[0];
            return {
                id: `PROD-${item.productId}`,
                price: Math.round(priceInfo.price),
                quantity: item.qty,
                name: (product.name as any)?.en || 'Product',
            };
        });

        if (totals.shippingCost > 0) {
            itemDetailsForMidtrans.push({
                id: 'SHIPPING',
                price: Math.round(totals.shippingCost),
                quantity: 1,
                name: 'Shipping Cost',
            });
        }

        paymentResponse = await this.midtransService.createTransaction(
          orderIdForMidtrans,
          totals.total,
          itemDetailsForMidtrans,
          { name: user.name, email: user.email },
          paymentMethod.id,
        );
        orderData.midtransOrderId = orderIdForMidtrans;
        break;

      case 'paypal':
        const refIdForPaypal = `PAYPAL-${userId}-${Date.now()}`;
        paymentResponse = await this.paypalService.createPaypalOrder(
          totals.total,
          dto.currencyCode,
          paymentMethod.id,
          refIdForPaypal,
        );
        orderData.paypalOrderId = paymentResponse.id;
        break;

      case 'bank_transfer':
      case 'wise':
      case 'pay_later':
        paymentResponse = { paymentType: 'DEFERRED' };
        break;

      default:
        throw new BadRequestException('Unsupported payment method.');
    }

    // Langkah 3: Simpan order ke database SETELAH gateway berhasil
    const finalOrderPayload: SaveOrderPayload = {
        ...dto,
        ...totals,
        ...orderData,
        userId,
    };
    const order = await this._saveOrderToDb(finalOrderPayload);
    await this._sendTelegramNotification(order);

    // Langkah 4: Kembalikan respons yang sesuai ke frontend
    if (paymentMethod.code === 'midtrans') {
      return {
        paymentType: 'MIDTRANS',
        snapToken: paymentResponse.snapToken,
        redirectUrl: paymentResponse.redirectUrl,
        internalOrderId: order.id,
      };
    }
    if (paymentMethod.code === 'paypal') {
      return {
        paymentType: 'PAYPAL_CHECKOUT',
        paypalOrderId: paymentResponse.id,
        internalOrderId: order.id,
      };
    }
    if (['bank_transfer', 'wise'].includes(paymentMethod.code)) {
        const configObject = typeof paymentMethod.config === 'object' && paymentMethod.config !== null ? paymentMethod.config : {};
        const instructions = { ...configObject, amount: order.total, paymentDueDate: order.paymentDueDate };
        return { ...mapOrderToDto(order), paymentType: 'MANUAL', instructions };
    }
    if (paymentMethod.code === 'pay_later') {
        return { ...mapOrderToDto(order), paymentType: 'DEFERRED' };
    }
  }

  /**
   * Helper untuk kalkulasi total dan validasi produk.
   */
  private async _calculateTotals(dto: CreateOrderDto): Promise<CalculatedTotals> {
    const { orderItems, shippingRateId, currencyCode } = dto;
    if (!orderItems || orderItems.length === 0) {
      throw new BadRequestException('Order items cannot be empty.');
    }

    const productIds = orderItems.map((item) => item.productId);
    const productsFromDb = await this.prisma.product.findMany({
      where: { id: { in: productIds }, isActive: true },
      include: {
        prices: { where: { currency: { code: currencyCode } } },
        images: { take: 1, orderBy: { id: 'asc' } },
      },
    });
    const productMap = new Map(productsFromDb.map((p) => [p.id, p]));

    let subtotal = 0;
    for (const item of orderItems) {
      const product = productMap.get(item.productId);
      if (!product) throw new BadRequestException(`Product with ID ${item.productId} not found or inactive.`);
      if (product.stock < item.qty) throw new BadRequestException(`Insufficient stock for product ${(product.name as any)?.en}.`);
      if (!product.prices[0]) throw new BadRequestException(`Price in ${currencyCode} not found for product ${(product.name as any)?.en}.`);
      subtotal += product.prices[0].price * item.qty;
    }

    let shippingCost = 0;
    if (shippingRateId) {
      const rate = await this.prisma.shippingRate.findUnique({
        where: { id: shippingRateId },
        include: { prices: { where: { currency: { code: currencyCode } } } },
      });
      if (!rate?.prices[0]) throw new BadRequestException(`Invalid shipping rate for currency ${currencyCode}.`);
      shippingCost = rate.prices[0].price;
    }

    return { subtotal, shippingCost, total: subtotal + shippingCost, productMap };
  }

  /**
   * Helper untuk menyimpan order dan itemnya ke DB dalam satu transaksi.
   */
  private async _saveOrderToDb(payload: SaveOrderPayload): Promise<OrderWithDetails> {
    const { userId, address, shippingCost, subtotal, total, paymentMethodId, currencyCode, midtransOrderId, paypalOrderId, orderItems, productMap } = payload;
    
    const paymentDueDate = new Date();
    paymentDueDate.setDate(paymentDueDate.getDate() + 2);

    return this.prisma.$transaction(async (tx) => {
      for (const item of orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.qty } },
        });
      }

      const newOrder = await tx.order.create({
        data: {
          userId,
          address,
          shippingCost,
          subtotal,
          total,
          paymentStatus: 'PENDING',
          orderStatus: OrderStatus.PENDING_PAYMENT,
          paymentMethodId,
          paymentDueDate,
          currencyCode,
          midtransOrderId,
          paypalOrderId,
          orderItems: {
            create: orderItems.map((item) => {
              const product = productMap.get(item.productId);
              return {
                productId: item.productId,
                productName: product.name ?? Prisma.JsonNull,
                productVariant: product.variant ?? Prisma.JsonNull,
                productImage: product.images.length > 0 ? product.images[0].url : null,
                price: product.prices[0].price,
                qty: item.qty,
                subtotal: product.prices[0].price * item.qty,
              };
            }),
          },
        },
        include: { user: true, orderItems: { include: { product: true } }, paymentMethod: true },
      });

      await this.cartService.clearCart(userId);
      return newOrder;
    });
  }

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
 *Pesanan Baru Diterima: #${order.id}*
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

  /**
   * REVISI: Mengaktifkan dan mengimplementasikan logika pembayaran ulang.
   */
  async retryPayment(orderId: number, userId: number) {
    this.logger.log(`User #${userId} is attempting to retry payment for order #${orderId}`);
    
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: {
        user: true,
        paymentMethod: true,
        orderItems: true,
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found or you do not have permission to access it.');
    }
    if (order.orderStatus !== OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Payment can only be retried for orders awaiting payment.');
    }

    if (!order.paymentMethod) {
      throw new BadRequestException('Payment method not found for this order.');
    }
    switch (order.paymentMethod.code) {
      case 'midtrans':
        const itemDetails = order.orderItems.map(item => ({
            id: `PROD-${item.productId}`,
            price: Math.round(item.price),
            quantity: item.qty,
            name: (item.productName as any)?.en || 'Product',
        }));
        if (order.shippingCost > 0) {
            itemDetails.push({
                id: 'SHIPPING',
                price: Math.round(order.shippingCost),
                quantity: 1,
                name: 'Shipping Cost',
            });
        }

        const newMidtransOrderId = `ORDER-${order.id}-RETRY-${Date.now()}`;

        if (order.paymentMethodId === null) {
            throw new BadRequestException('Payment method ID is missing for this order.');
        }
        const midtransTransaction = await this.midtransService.createTransaction(
            newMidtransOrderId,
            order.total,
            itemDetails,
            { name: order.user.name, email: order.user.email },
            order.paymentMethodId,
        );

        await this.prisma.order.update({
            where: { id: order.id },
            data: { midtransOrderId: newMidtransOrderId }
        });

        return {
            paymentType: 'MIDTRANS',
            snapToken: midtransTransaction.snapToken,
            redirectUrl: midtransTransaction.redirectUrl,
            internalOrderId: order.id,
        };

      case 'paypal':
        // Alur retry untuk PayPal tidak didukung dalam skenario "Bayar Nanti"
        throw new BadRequestException('Direct payment methods like PayPal cannot be retried from a deferred state.');

      default:
        throw new BadRequestException(`Payment retry is not supported for the '${order.paymentMethod.name}' method.`);
    }
  }
  
  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredOrders() {
    this.logger.log('Running cron job to check for expired orders...');
    const expiredOrders = await this.prisma.order.findMany({
      where: { 
        orderStatus: OrderStatus.PENDING_PAYMENT,
        paymentDueDate: { lt: new Date() } 
      },
      include: { orderItems: true },
    });

    if (expiredOrders.length > 0) {
      this.logger.log(`Found ${expiredOrders.length} expired orders. Processing...`);
      for (const order of expiredOrders) {
        await this.prisma.$transaction(async (tx) => {
          await tx.order.update({ 
            where: { id: order.id }, 
            data: { 
              paymentStatus: PaymentStatus.CANCELLED, 
              orderStatus: OrderStatus.CANCELLED 
            } 
          });
          for (const item of order.orderItems) {
            if (item.productId) {
              await tx.product.update({ 
                where: { id: item.productId }, 
                data: { stock: { increment: item.qty } } 
              });
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
        ? { id: item.product.id, name: item.product.name }
        : { id: item.productId ?? 0, name: item.productName },
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

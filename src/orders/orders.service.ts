// File: src/orders/orders.service.ts

import { Injectable, BadRequestException, ForbiddenException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PaymentService } from '../payment/payment.service';
import { CartService } from '../cart/cart.service';
import { sendTelegramMessage } from '../utils/telegram.util';
import * as PDFDocument from 'pdfkit';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { Cron, CronExpression } from '@nestjs/schedule';

const mapOrderToDto = (
  order: Prisma.OrderGetPayload<{
    include: {
      user: true;
      orderItems: { include: { product: true } };
      paymentMethod: true;
    };
  }>,
) => {
  if (!order) return null;

  return {
    ...order,
    paymentDueDate: order.paymentDueDate ?? undefined,
    orderItems: order.orderItems.map((item) => ({
      ...item,
      productImage: item.productImage ?? undefined,
      product: {
        id: item.product?.id || item.productId || 0,
        name: item.productName, 
        variant: item.productVariant,
        image: item.productImage,
      },
    })),
  };
};

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,
    private cartService: CartService,
  ) {}

  async create(userId: number, dto: CreateOrderDto) {
    const { orderItems, currencyCode, paymentMethodId, shippingRateId, address } = dto;
    if (!orderItems || orderItems.length === 0) {
      throw new BadRequestException('Order items cannot be empty.');
    }

    const transactionResult = await this.prisma.$transaction(async (tx) => {
      const paymentMethod = await tx.paymentMethod.findUnique({ where: { id: paymentMethodId } });
      if (!paymentMethod || !paymentMethod.isActive) {
        throw new BadRequestException('Invalid or disabled payment method');
      }

      const productIds = orderItems.map((item) => item.productId);
      const productsFromDb = await tx.product.findMany({
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
        if (!product) throw new BadRequestException(`Product with ID ${item.productId} not found.`);
        const productNameForError = (product.name as any)?.en || 'Unknown Product';
        if (product.stock < item.qty) throw new BadRequestException(`Insufficient stock for product ${productNameForError}.`);
        const priceInfo = product.prices[0];
        if (!priceInfo) throw new BadRequestException(`Price in ${currencyCode} not found for product ${productNameForError}.`);
        subtotal += priceInfo.price * item.qty;
      }

      let shippingCost = 0;
      if (shippingRateId) {
        const rate = await tx.shippingRate.findUnique({ 
            where: { id: shippingRateId },
            include: { prices: { where: { currency: { code: currencyCode } } } },
        });
        if (!rate || !rate.prices[0]) throw new BadRequestException(`Invalid shipping rate for currency ${currencyCode}.`);
        shippingCost = rate.prices[0].price;
      }
      
      const total = subtotal + shippingCost;
      const paymentDueDate = new Date();
      paymentDueDate.setDate(paymentDueDate.getDate() + 2);

      // --- Perubahan #1: Kurangi stok produk di sini
      for (const item of orderItems) {
        if (item.productId) { // Tambahkan pemeriksaan ini
          await tx.product.update({
              where: { id: item.productId },
              data: { stock: { decrement: item.qty } },
          });
        }
      }

      const order = await tx.order.create({
        data: {
          userId, address, shippingCost, subtotal, total, paymentStatus: 'PENDING', orderStatus: 'PROCESSING', paymentMethodId, paymentDueDate,
          orderItems: {
            create: orderItems.map((item) => {
              const product = productMap.get(item.productId);
              if (!product) throw new InternalServerErrorException('Product data inconsistency.');
              const priceInfo = product.prices[0];
              return { productId: item.productId, productName: product.name ?? Prisma.JsonNull, productVariant: product.variant ?? Prisma.JsonNull, productImage: product.images.length > 0 ? product.images[0].url : null, price: priceInfo.price, qty: item.qty, subtotal: priceInfo.price * item.qty };
            }),
          },
        },
        include: { user: true, orderItems: { include: { product: true } }, paymentMethod: true },
      });

      const cart = await tx.cart.findUnique({ where: { userId } });
      if (cart) {
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      }

      return { order, paymentMethod };
    });

    const { order, paymentMethod } = transactionResult;
    const mappedOrder = mapOrderToDto(order);

    if (!mappedOrder || !mappedOrder.paymentMethod) {
      throw new InternalServerErrorException('Failed to map created order or its payment method.');
    }
    
    const setting = await this.prisma.generalSetting.findUnique({ where: { id: 1 } });
    if (setting?.telegramBotToken && setting?.telegramChatId) {
      const totalFormatted = mappedOrder.total?.toLocaleString('id-ID', { style: 'currency', currency: currencyCode }) || mappedOrder.total;
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
          `💸 Total: *${totalFormatted}*\n` +
          `🔗 Metode: ${mappedOrder.paymentMethod?.name || '-'}\n` +
          `[Admin Panel]`;
      sendTelegramMessage(setting.telegramBotToken, setting.telegramChatId, text);
    }
    
    if (paymentMethod.code === 'midtrans') {
      if (!mappedOrder.paymentMethod) {
        throw new InternalServerErrorException('Payment method is missing from the order.');
      }
      if (!paymentMethod.config || typeof paymentMethod.config !== 'object') {
        throw new InternalServerErrorException('Midtrans payment method config is missing or invalid.');
      }
      const orderWithPaymentMethod = { ...mappedOrder, paymentMethod: mappedOrder.paymentMethod };
      const snap = await this.paymentService.createMidtransTransaction(orderWithPaymentMethod, paymentMethod.config as any);
      return { ...mappedOrder, paymentType: 'MIDTRANS', snapToken: snap.snapToken, redirectUrl: snap.redirectUrl };
    }
    if (paymentMethod.code === 'paypal') {
        if (!mappedOrder.paymentMethod) {
            throw new InternalServerErrorException('Payment method is missing from the order.');
        }
        if (!paymentMethod.config || typeof paymentMethod.config !== 'object') {
            throw new InternalServerErrorException('PayPal payment method config is missing or invalid.');
        }
        const orderWithPaymentMethod = { ...mappedOrder, paymentMethod: mappedOrder.paymentMethod };
        const paypalData = await this.paymentService.createPaypalTransaction(orderWithPaymentMethod, paymentMethod.config as any, currencyCode);
        return { ...mappedOrder, paymentType: 'PAYPAL', approvalUrl: paypalData.approvalUrl };
    }
    if (['bank_transfer', 'wise'].includes(paymentMethod.code)) {
        const configObject = (typeof paymentMethod.config === 'object' && paymentMethod.config !== null) ? paymentMethod.config : {};
        const instructions = { ...configObject, amount: order.total, paymentDueDate: order.paymentDueDate };
        return { ...mappedOrder, paymentType: 'MANUAL', instructions };
    }
    
    return mappedOrder;
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

    return {
        data: orders.map(mapOrderToDto),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
    };
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
    if (userId && order.userId !== userId) {
      throw new ForbiddenException('Forbidden');
    }
    return mapOrderToDto(order);
  }

  async update(id: number, dto: UpdateOrderDto) {
    const { paymentStatus, orderStatus, trackingNumber } = dto;
    
    // Fetch existing order with order items to check the old status and quantities
    const existingOrder = await this.prisma.order.findUnique({ 
        where: { id },
        include: { orderItems: true } 
    });

    if (!existingOrder) {
      throw new NotFoundException('Order not found');
    }
    
    // Logika baru untuk mengembalikan stok hanya jika status berubah menjadi CANCELLED
    const isStatusChangingToCancelled = existingOrder.orderStatus !== OrderStatus.CANCELLED && orderStatus === OrderStatus.CANCELLED;

    // Gunakan transaction untuk memastikan pembaruan data atomik
    await this.prisma.$transaction(async (tx) => {
        // Perbarui status pesanan
        await tx.order.update({
            where: { id },
            data: {
                paymentStatus,
                orderStatus,
                trackingNumber,
            },
        });

        // Jika status pesanan diubah menjadi CANCELLED, kembalikan stok produk
        if (isStatusChangingToCancelled) {
            for (const item of existingOrder.orderItems) {
                if (item.productId) { // Tambahkan pemeriksaan ini
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { increment: item.qty } },
                    });
                }
            }
        }
    });

    return this.findOne(id);
  }

  async handlePaymentNotification(payload: any) {
    const orderIdString = payload.order_id?.split('-')[1];
    if (!orderIdString) throw new BadRequestException('order_id is missing or in an invalid format');
    
    const orderId = parseInt(orderIdString, 10);
    if (isNaN(orderId)) throw new BadRequestException('Invalid order_id format in notification');

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { paymentMethod: true, orderItems: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found from notification');
    }
    
    if (!order.paymentMethod) {
        throw new InternalServerErrorException(`Order #${orderId} does not have a linked payment method.`);
    }

    if(order.paymentMethod.code === 'midtrans') {
      if (!order.paymentMethod.config) {
        throw new InternalServerErrorException('Payment method config not found');
      }
      const serverKey = order.paymentMethod.config['serverKey'];
      if (!serverKey) {
        throw new InternalServerErrorException('Server key not configured for payment method');
      }
      
      const signatureKey = crypto.createHash('sha512').update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`).digest('hex');
      if (signatureKey !== payload.signature_key) {
        throw new ForbiddenException('Invalid signature');
      }
    }

    let newPaymentStatus: PaymentStatus;
    const transactionStatus = payload.transaction_status;

    if (transactionStatus === 'settlement' || transactionStatus === 'capture') {
        newPaymentStatus = PaymentStatus.PAID;
    } else if (transactionStatus === 'cancel' || transactionStatus === 'deny' || transactionStatus === 'expire') {
        newPaymentStatus = PaymentStatus.CANCELLED;
        if (order.paymentStatus !== newPaymentStatus) {
            for (const item of order.orderItems) {
                if (item.productId) { // Tambahkan pemeriksaan ini
                    await this.prisma.product.update({
                        where: { id: item.productId },
                        data: { stock: { increment: item.qty } },
                    });
                }
            }
        }
    } else {
        return { message: 'Notification for pending status received, no action taken.' };
    }

    if (order.paymentStatus !== newPaymentStatus) {
        await this.prisma.order.update({
            where: { id: orderId },
            data: { paymentStatus: newPaymentStatus },
        });
    }

    return { message: 'Payment notification processed successfully' };
  }
  
  async generateInvoicePdf(orderId: number, userId?: number): Promise<Buffer> {
    const order = await this.findOne(orderId, userId);
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const buffers: Buffer[] = [];
    doc.on('data', (d) => buffers.push(d));

    doc.fontSize(16).text('INVOICE', { align: 'center', underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Order ID: #${order.id}    |    Date: ${order.createdAt.toLocaleDateString('id-ID')}`);
    doc.moveDown(0.5);
    doc.text(`Customer: ${order.user?.name || order.userId} (${order.user?.email || '-'})`);
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
  
  async retryPayment(orderId: number, userId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId, userId },
      include: {
        user: true,
        paymentMethod: true,
        orderItems: { include: { product: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found or not owned by user.');
    }
    
    if (order.paymentStatus !== 'PENDING') {
      throw new BadRequestException('Payment can only be retried for orders with PENDING status.');
    }

    const mappedOrder = mapOrderToDto(order);

    if (!mappedOrder) {
      throw new InternalServerErrorException('Failed to map order data.');
    }

    if (!mappedOrder.paymentMethod) {
      throw new InternalServerErrorException('Payment method is missing from the order.');
    }

    if (mappedOrder.paymentMethod?.code === 'midtrans') {
      if (!mappedOrder.paymentMethod.config || typeof mappedOrder.paymentMethod.config !== 'object') {
        throw new InternalServerErrorException('Midtrans payment method config is missing or invalid.');
      }
      const orderWithPaymentMethod = { ...mappedOrder, paymentMethod: mappedOrder.paymentMethod };
      const snap = await this.paymentService.createMidtransTransaction(orderWithPaymentMethod, mappedOrder.paymentMethod.config as any);
      return { paymentType: 'MIDTRANS', snapToken: snap.snapToken, redirectUrl: snap.redirectUrl };
    }

    if (mappedOrder.paymentMethod?.code === 'paypal') {
      if (!mappedOrder.paymentMethod.config || typeof mappedOrder.paymentMethod.config !== 'object') {
        throw new InternalServerErrorException('PayPal payment method config is missing or invalid.');
      }
      const currencyCode = 'IDR';
      const orderWithPaymentMethod = { ...mappedOrder, paymentMethod: mappedOrder.paymentMethod };
      const paypalData = await this.paymentService.createPaypalTransaction(orderWithPaymentMethod, mappedOrder.paymentMethod.config as any, currencyCode);
      return { paymentType: 'PAYPAL', approvalUrl: paypalData.approvalUrl };
    }

    if (mappedOrder.paymentMethod && ['bank_transfer', 'wise'].includes(mappedOrder.paymentMethod.code)) {
        const configObject = (typeof mappedOrder.paymentMethod.config === 'object' && mappedOrder.paymentMethod.config !== null) ? mappedOrder.paymentMethod.config : {};
        const instructions = { ...configObject, amount: mappedOrder.total, paymentDueDate: mappedOrder.paymentDueDate };
        return { paymentType: 'MANUAL', instructions };
    }

    throw new BadRequestException('Payment method is not supported for retry payment.');
  }

  // --- Cron Job untuk menangani pesanan kedaluwarsa ---
  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredOrders() {
      console.log('Running cron job to check for expired orders...');
      const expiredOrders = await this.prisma.order.findMany({
          where: {
              paymentStatus: PaymentStatus.PENDING,
              paymentDueDate: { lt: new Date() },
          },
          include: { orderItems: true },
      });

      if (expiredOrders.length > 0) {
          console.log(`Found ${expiredOrders.length} expired orders. Processing...`);
          for (const order of expiredOrders) {
              await this.prisma.$transaction(async (tx) => {
                  await tx.order.update({
                      where: { id: order.id },
                      data: {
                          paymentStatus: PaymentStatus.CANCELLED,
                          orderStatus: OrderStatus.CANCELLED,
                      },
                  });

                  for (const item of order.orderItems) {
                      if (item.productId) {
                          await tx.product.update({
                              where: { id: item.productId },
                              data: { stock: { increment: item.qty } },
                          });
                      }
                  }
              });
              console.log(`Order #${order.id} expired. Status updated to CANCELLED and stock returned.`);
          }
      } else {
          console.log('No expired orders found.');
      }
  }
}

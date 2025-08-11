import { Injectable, BadRequestException, ForbiddenException, NotFoundException, InternalServerErrorException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PaymentService } from '../payment/payment.service';
import { CartService } from '../cart/cart.service';
import { sendTelegramMessage } from '../utils/telegram.util';
import * as PDFDocument from 'pdfkit';
import { OrderStatus, PaymentStatus, Prisma, User } from '@prisma/client';
import * as crypto from 'crypto';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderResponseDto } from './dto/order-response.dto';

type OrderWithDetails = Prisma.OrderGetPayload<{
  include: {
    user: true;
    orderItems: { include: { product: true } };
    paymentMethod: true;
  };
}>;

// Helper function ini tetap sama
const mapOrderToDto = (order: OrderWithDetails | null) => {
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
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private paymentService: PaymentService,
    private cartService: CartService,
  ) {}
  
  // Method create() tidak perlu diubah, karena logikanya sudah benar.
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
    
    this._sendTelegramNotification(order);
    
    const mappedOrder = mapOrderToDto(order);
    if (!mappedOrder || !mappedOrder.paymentMethod) {
      throw new InternalServerErrorException('Failed to map created order or its payment method.');
    }
    
    if (paymentMethod.code === 'midtrans') {
      if (!paymentMethod.config || typeof paymentMethod.config !== 'object') {
        throw new InternalServerErrorException('Midtrans payment method config is missing or invalid.');
      }
      const snap = await this.paymentService.createMidtransTransaction(mappedOrder as OrderResponseDto, paymentMethod.config as any);
      return { ...mappedOrder, paymentType: 'MIDTRANS', snapToken: snap.snapToken, redirectUrl: snap.redirectUrl };
    }
    
    if (paymentMethod.code === 'paypal') {
        if (!paymentMethod.config || typeof paymentMethod.config !== 'object') {
            throw new InternalServerErrorException('PayPal payment method config is missing or invalid.');
        }
        const paypalData = await this.paymentService.createPaypalTransaction(mappedOrder as OrderResponseDto, paymentMethod.config as any, currencyCode);
        return { ...mappedOrder, paymentType: 'PAYPAL', approvalUrl: paypalData.approvalUrl };
    }
    if (['bank_transfer', 'wise'].includes(paymentMethod.code)) {
        const configObject = (typeof paymentMethod.config === 'object' && paymentMethod.config !== null) ? paymentMethod.config : {};
        const instructions = { ...configObject, amount: order.total, paymentDueDate: order.paymentDueDate };
        return { ...mappedOrder, paymentType: 'MANUAL', instructions };
    }
    
    return mappedOrder;
  }

  // --- WEBHOOK HANDLER YANG SEPENUHNYA DIREVISI ---
  async handlePaymentNotification(payload: any) {
    this.logger.log('[Webhook] Received payment notification from Midtrans.');
    this.logger.debug('[Webhook] Payload:', JSON.stringify(payload, null, 2));

    // 1. Parsing Order ID yang lebih andal
    const orderIdString = payload.order_id?.replace('ORDER-', '');
    if (!orderIdString) {
      this.logger.error('[Webhook] order_id is missing or in an invalid format.');
      throw new BadRequestException('order_id is missing or in an invalid format');
    }
    
    const orderId = parseInt(orderIdString, 10);
    if (isNaN(orderId)) {
      this.logger.error(`[Webhook] Invalid order_id format: ${orderIdString}`);
      throw new BadRequestException('Invalid order_id format in notification');
    }
    this.logger.log(`[Webhook] Parsed Order ID: ${orderId}`);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { paymentMethod: true, orderItems: true },
    });

    if (!order) {
      this.logger.warn(`[Webhook] Order #${orderId} not found in database. Acknowledging to stop retries.`);
      // Kembalikan 200 OK agar Midtrans tidak mengirim notifikasi berulang untuk order yang tidak ada.
      return { message: `Order #${orderId} not found, but acknowledged.` };
    }
    
    if (order.paymentMethod?.code !== 'midtrans') {
      this.logger.warn(`[Webhook] Order #${orderId} was not paid with Midtrans. Ignoring.`);
      return { message: 'Not a Midtrans order, ignored.' };
    }

    if (!order.paymentMethod.config || typeof order.paymentMethod.config !== 'object') {
      this.logger.error(`[Webhook] Midtrans config not found for Order #${orderId}`);
      throw new InternalServerErrorException('Payment method config not found');
    }

    const serverKey = order.paymentMethod.config['serverKey'] as string;
    if (!serverKey) {
      this.logger.error(`[Webhook] Server key not configured for Order #${orderId}`);
      throw new InternalServerErrorException('Server key not configured for payment method');
    }
    
    // 2. Verifikasi Signature (tetap sama, tapi krusial)
    const signatureKey = crypto.createHash('sha512').update(`${payload.order_id}${payload.status_code}${payload.gross_amount}${serverKey}`).digest('hex');
    this.logger.log(`[Webhook] Generated Signature: ${signatureKey}`);
    this.logger.log(`[Webhook] Midtrans Signature:  ${payload.signature_key}`);

    if (signatureKey !== payload.signature_key) {
      this.logger.error(`[Webhook] Invalid signature for Order #${orderId}`);
      throw new ForbiddenException('Invalid signature');
    }
    this.logger.log('[Webhook] Signature is valid.');

    // 3. Logika pembaruan status yang lebih jelas
    let newPaymentStatus: PaymentStatus;
    let newOrderStatus: OrderStatus | undefined = undefined; // Siapkan variabel untuk status order
    const transactionStatus = payload.transaction_status;
    this.logger.log(`[Webhook] Transaction Status: ${transactionStatus}`);

    if (transactionStatus === 'settlement' || transactionStatus === 'capture') {
        newPaymentStatus = PaymentStatus.PAID;
        // Status order tetap 'PROCESSING', ini sudah benar karena pesanan perlu diproses setelah dibayar.
    } else if (transactionStatus === 'cancel' || transactionStatus === 'deny' || transactionStatus === 'expire') {
        newPaymentStatus = PaymentStatus.CANCELLED;
        newOrderStatus = OrderStatus.CANCELLED; // Batalkan order juga
        
        // Kembalikan stok jika pembayaran gagal/kedaluwarsa (hanya jika status belum CANCELLED)
        if (order.paymentStatus !== PaymentStatus.CANCELLED) {
            this.logger.log(`[Webhook] Restoring stock for cancelled Order #${orderId}`);
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
        this.logger.log(`[Webhook] Notification for pending/unhandled status (${transactionStatus}) received for Order #${orderId}. No action taken.`);
        return { message: 'Notification for pending status received, no action taken.' };
    }

    // 4. Update ke database hanya jika ada perubahan status
    if (order.paymentStatus !== newPaymentStatus) {
        await this.prisma.order.update({
            where: { id: orderId },
            data: { 
              paymentStatus: newPaymentStatus,
              // Update orderStatus juga jika nilainya sudah di-set (misal: saat dibatalkan)
              ...(newOrderStatus && { orderStatus: newOrderStatus }),
            },
        });
        this.logger.log(`[Webhook] SUCCESS: Order #${orderId} payment status updated to ${newPaymentStatus}. Order status is now ${newOrderStatus || order.orderStatus}.`);
    } else {
        this.logger.log(`[Webhook] Order #${orderId} status is already ${newPaymentStatus}. No update needed.`);
    }

    return { message: 'Payment notification processed successfully' };
  }

  // Sisa dari file (findAll, findOne, update, dll.) tetap sama
  // ...
  
  private async _sendTelegramNotification(order: OrderWithDetails): Promise<void> {
    this.logger.log(`[Telegram] Memulai proses notifikasi untuk Order #${order.id}...`);

    const setting = await this.prisma.generalSetting.findUnique({ where: { id: 1 } });
    if (!setting?.telegramBotToken || !setting?.telegramChatId) {
      this.logger.error(`[Telegram] Proses dihentikan: Bot Token atau Chat ID tidak ditemukan.`);
      return;
    }

    const totalFormatted = order.total.toLocaleString('id-ID', { style: 'currency', currency: 'IDR' });
    const itemsText = order.orderItems.map((item, idx) => {
        const name = (item.productName as any)?.id || (item.productName as any)?.en || 'N/A';
        const price = item.price.toLocaleString('id-ID');
        return `${idx + 1}. ${name} (x${item.qty}) - @${price}`;
    }).join('\n');

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
    
    const existingOrder = await this.prisma.order.findUnique({ 
        where: { id },
        include: { orderItems: true } 
    });

    if (!existingOrder) {
      throw new NotFoundException('Order not found');
    }
    
    const isStatusChangingToCancelled = existingOrder.orderStatus !== OrderStatus.CANCELLED && orderStatus === OrderStatus.CANCELLED;

    await this.prisma.$transaction(async (tx) => {
        await tx.order.update({
            where: { id },
            data: {
                paymentStatus,
                orderStatus,
                trackingNumber,
            },
        });

        if (isStatusChangingToCancelled) {
            for (const item of existingOrder.orderItems) {
                if (item.productId) {
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
      const snap = await this.paymentService.createMidtransTransaction(mappedOrder as OrderResponseDto, mappedOrder.paymentMethod.config as any);
      return { paymentType: 'MIDTRANS', snapToken: snap.snapToken, redirectUrl: snap.redirectUrl };
    }

    if (mappedOrder.paymentMethod?.code === 'paypal') {
      if (!mappedOrder.paymentMethod.config || typeof mappedOrder.paymentMethod.config !== 'object') {
        throw new InternalServerErrorException('PayPal payment method config is missing or invalid.');
      }
      const currencyCode = 'IDR';
      const paypalData = await this.paymentService.createPaypalTransaction(mappedOrder as OrderResponseDto, mappedOrder.paymentMethod.config as any, currencyCode);
      return { paymentType: 'PAYPAL', approvalUrl: paypalData.approvalUrl };
    }

    if (mappedOrder.paymentMethod && ['bank_transfer', 'wise'].includes(mappedOrder.paymentMethod.code)) {
        const configObject = (typeof mappedOrder.paymentMethod.config === 'object' && mappedOrder.paymentMethod.config !== null) ? mappedOrder.paymentMethod.config : {};
        const instructions = { ...configObject, amount: mappedOrder.total, paymentDueDate: mappedOrder.paymentDueDate };
        return { ...mappedOrder, paymentType: 'MANUAL', instructions };
    }

    throw new BadRequestException('Payment method is not supported for retry payment.');
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredOrders() {
      this.logger.log('Running cron job to check for expired orders...');
      const expiredOrders = await this.prisma.order.findMany({
          where: {
              paymentStatus: PaymentStatus.PENDING,
              paymentDueDate: { lt: new Date() },
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
              this.logger.log(`Order #${order.id} expired. Status updated to CANCELLED and stock returned.`);
          }
      } else {
          this.logger.log('No expired orders found.');
      }
  }
}
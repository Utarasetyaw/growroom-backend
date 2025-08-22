import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
  Inject,
  forwardRef,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { CartService } from '../cart/cart.service';
import { sendTelegramMessage } from '../utils/telegram.util';
import { OrderStatus, PaymentStatus, Prisma, User, Product } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrderResponseDto } from './dto/order-response.dto';
import { MidtransService } from '../midtrans/midtrans.service';
import { PaypalService } from '../paypal/paypal.service';
import { PdfService } from '../pdf/pdf.service';

// Tipe helper untuk data order yang menyertakan relasi
type OrderWithDetails = Prisma.OrderGetPayload<{
  include: {
    user: true;
    orderItems: { 
      include: { 
        product: {
          include: { images: { take: 1, orderBy: { id: 'asc' } } }
        } 
      } 
    };
    paymentMethod: true;
  };
}>;

// Tipe helper untuk hasil kalkulasi
interface CalculatedTotals {
  subtotal: number;
  shippingCost: number;
  total: number;
  productMap: Map<number, Prisma.ProductGetPayload<{ include: { prices: true; images: true } }>>;
}

// Tipe helper untuk payload penyimpanan order
interface SaveOrderPayload extends CreateOrderDto, CalculatedTotals {
  userId: number;
  midtransOrderId?: string;
  paypalOrderId?: string;
  paypalCaptureDetails?: any;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private cartService: CartService,
    private midtransService: MidtransService,
    @Inject(forwardRef(() => PaypalService))
    private paypalService: PaypalService,
    private pdfService: PdfService,
  ) {}

  async create(userId: number, dto: CreateOrderDto) {
    const { paymentMethodId } = dto;

    const [paymentMethod, user] = await Promise.all([
      this.prisma.paymentMethod.findUnique({ where: { id: paymentMethodId } }),
      this.prisma.user.findUnique({ where: { id: userId } }),
    ]);

    if (!paymentMethod || !paymentMethod.isActive) {
      throw new BadRequestException('Metode pembayaran tidak valid atau nonaktif.');
    }
    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan.');
    }

    const totals = await this._calculateTotals(dto);

    // Logika untuk setiap metode pembayaran
    switch (paymentMethod.code) {
      case 'midtrans': {
        try {
          const orderIdForMidtrans = `ORDER-${userId}-${Date.now()}`;
          const itemDetailsForMidtrans = dto.orderItems.map((item) => {
            const product = totals.productMap.get(item.productId);
            if (!product || !product.prices[0]) {
              throw new BadRequestException(`Detail produk atau harga untuk ID ${item.productId} tidak valid.`);
            }
            return {
              id: `PROD-${item.productId}`,
              price: Math.round(product.prices[0].price),
              quantity: item.qty,
              name: (product.name as any)?.en || 'Product',
            };
          });
          if (totals.shippingCost > 0) {
            itemDetailsForMidtrans.push({ id: 'SHIPPING', price: Math.round(totals.shippingCost), quantity: 1, name: 'Shipping Cost' });
          }
          
          const paymentResponse = await this.midtransService.createTransaction(
            orderIdForMidtrans,
            totals.total,
            itemDetailsForMidtrans,
            { name: user.name, email: user.email },
            paymentMethod.id,
          );
          
          const order = await this._saveOrderToDb({ ...dto, ...totals, userId, midtransOrderId: orderIdForMidtrans });
          await this._sendTelegramNotification(order);
          
          return {
            paymentType: 'MIDTRANS',
            snapToken: paymentResponse.snapToken,
            redirectUrl: paymentResponse.redirectUrl,
            internalOrderId: order.id,
          };
        } catch (error) {
          this.logger.error(`[Midtrans Create] Gagal membuat transaksi: ${error.message}`, error.stack);
          throw new BadRequestException('Gagal memproses pembayaran Midtrans.');
        }
      }
      case 'paypal': {
        try {
          const refIdForPaypal = `PAYPAL-TEMP-${userId}-${Date.now()}`;
          const paypalOrderResponse = await this.paypalService.createPaypalOrder(
            totals.total,
            dto.currencyCode,
            paymentMethod.id,
            refIdForPaypal,
          );
          
          return {
            paymentType: 'PAYPAL_CHECKOUT',
            paypalOrderId: paypalOrderResponse.id,
          };
        } catch (error) {
          this.logger.error(`[PayPal Create] Gagal membuat order: ${error.message}`, error.stack);
          throw new BadRequestException('Gagal memproses pembayaran PayPal.');
        }
      }
      case 'bank_transfer':
      case 'wise':
      case 'pay_later': {
        const order = await this._saveOrderToDb({ ...dto, ...totals, userId });
        await this._sendTelegramNotification(order);
        
        if (['bank_transfer', 'wise'].includes(paymentMethod.code)) {
          const configObject = typeof paymentMethod.config === 'object' && paymentMethod.config !== null ? paymentMethod.config : {};
          const instructions = { ...configObject, amount: order.total, paymentDueDate: order.paymentDueDate };
          const mappedOrder = mapOrderToDto(order);
          if (!mappedOrder) throw new InternalServerErrorException('Gagal memproses order.');
          return { ...mappedOrder, paymentType: 'MANUAL', instructions };
        }
        
        const mappedOrder = mapOrderToDto(order);
        if (!mappedOrder) throw new InternalServerErrorException('Gagal memproses order.');
        return { ...mappedOrder, paymentType: 'DEFERRED' };
      }
      default:
        throw new BadRequestException('Metode pembayaran tidak didukung.');
    }
  }
  
  async finalizePaypalOrder(userId: number, dto: CreateOrderDto, paypalCaptureDetails: any): Promise<OrderResponseDto> {
    this.logger.log(`[PayPal Finalize] Membuat order internal untuk PayPal Order ID: ${paypalCaptureDetails.id}`);
    
    const totals = await this._calculateTotals(dto);

    const order = await this._saveOrderToDb({ ...dto, ...totals, userId, paypalOrderId: paypalCaptureDetails.id, paypalCaptureDetails }, true);
    await this._sendTelegramNotification(order);
    
    const orderDto = mapOrderToDto(order);
    if (!orderDto) {
      this.logger.error(`Gagal memetakan order #${order.id} ke DTO.`);
      throw new InternalServerErrorException('Gagal memproses order yang telah dibuat.');
    }
    return orderDto;
  }

  private async _saveOrderToDb(payload: SaveOrderPayload, isPaid: boolean = false): Promise<OrderWithDetails> {
    const { userId, address, shippingCost, subtotal, total, paymentMethodId, currencyCode, midtransOrderId, paypalOrderId, orderItems, productMap, paypalCaptureDetails } = payload;
    
    const paymentDueDate = new Date();
    paymentDueDate.setDate(paymentDueDate.getDate() + 2);

    return this.prisma.$transaction(async (tx) => {
      // Kurangi stok produk
      for (const item of orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.qty } },
        });
      }

      // Buat record Order baru
      const newOrder = await tx.order.create({
        data: {
          userId,
          address,
          shippingCost,
          subtotal,
          total,
          paymentStatus: isPaid ? PaymentStatus.PAID : PaymentStatus.PENDING_PAYMENT,
          orderStatus: isPaid ? OrderStatus.PROCESSING : OrderStatus.PENDING,
          paymentMethodId,
          paymentDueDate: isPaid ? null : paymentDueDate,
          currencyCode,
          midtransOrderId,
          paypalOrderId,
          paymentDetails: paypalCaptureDetails ? (paypalCaptureDetails as Prisma.JsonObject) : Prisma.JsonNull,
          orderItems: {
            create: orderItems.map((item) => {
              const product = productMap.get(item.productId);
              if (!product) throw new InternalServerErrorException(`Produk ${item.productId} tidak valid.`);
              
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
        include: { user: true, orderItems: { include: { product: { include: { images: { take: 1, orderBy: { id: 'asc' } } } } } }, paymentMethod: true },
      });

      await this.cartService.clearCart(userId);
      return newOrder;
    });
  }

  private async _calculateTotals(dto: CreateOrderDto): Promise<CalculatedTotals> {
    const { orderItems, shippingRateId, currencyCode } = dto;
    if (!orderItems || orderItems.length === 0) {
      throw new BadRequestException('Item pesanan tidak boleh kosong.');
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
      if (!product) throw new BadRequestException(`Produk dengan ID ${item.productId} tidak ditemukan.`);
      if (product.stock < item.qty) throw new BadRequestException(`Stok tidak cukup untuk produk ${(product.name as any)?.en}.`);
      if (!product.prices[0]) throw new BadRequestException(`Harga dalam ${currencyCode} tidak ditemukan untuk ${(product.name as any)?.en}.`);
      subtotal += product.prices[0].price * item.qty;
    }

    let shippingCost = 0;
    if (shippingRateId) {
      const rate = await this.prisma.shippingRate.findUnique({
        where: { id: shippingRateId },
        include: { prices: { where: { currency: { code: currencyCode } } } },
      });
      if (!rate?.prices[0]) throw new BadRequestException(`Tarif pengiriman tidak valid untuk mata uang ${currencyCode}.`);
      shippingCost = rate.prices[0].price;
    }

    return { subtotal, shippingCost, total: subtotal + shippingCost, productMap };
  }

  private async _sendTelegramNotification(order: OrderWithDetails): Promise<void> {
    this.logger.log(`[Telegram] Memulai notifikasi untuk Order #${order.id}...`);
    const setting = await this.prisma.generalSetting.findUnique({ where: { id: 1 } });
    if (!setting?.telegramBotToken || !setting?.telegramChatId) {
      this.logger.error(`[Telegram] Gagal: Bot Token atau Chat ID tidak ditemukan.`);
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
        include: { user: true, orderItems: { include: { product: { include: { images: { take: 1, orderBy: { id: 'asc' } } } } } }, paymentMethod: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count(),
    ]);
    const mappedData = orders.map(mapOrderToDto).filter((o): o is OrderResponseDto => o !== null);
    return { data: mappedData, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findUserOrders(userId: number) {
    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: { user: true, orderItems: { include: { product: { include: { images: { take: 1, orderBy: { id: 'asc' } } } } } }, paymentMethod: true },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map(mapOrderToDto).filter((o): o is OrderResponseDto => o !== null);
  }

  async findOne(id: number, userId?: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { user: true, orderItems: { include: { product: { include: { images: { take: 1, orderBy: { id: 'asc' } } } } } }, paymentMethod: true },
    });
    if (!order) throw new NotFoundException('Order tidak ditemukan.');
    if (userId && order.userId !== userId) throw new ForbiddenException('Akses ditolak.');
    
    return mapOrderToDto(order);
  }
  
  async update(id: number, dto: UpdateOrderDto) {
    const { paymentStatus, orderStatus, trackingNumber } = dto;
    const existingOrder = await this.prisma.order.findUnique({ where: { id }, include: { orderItems: true } });
    if (!existingOrder) throw new NotFoundException('Order tidak ditemukan.');
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
    const orderData = await this.findOne(orderId, userId);
    if (!orderData) {
      throw new NotFoundException('Order tidak ditemukan atau akses ditolak.');
    }
    const lang = orderData.currencyCode === 'IDR' ? 'id' : 'en';
    return this.pdfService.generateInvoicePdf(orderData, lang);
  }

  async retryPayment(orderId: number, userId: number) {
    this.logger.log(`User #${userId} mencoba membayar ulang order #${orderId}`);
    
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
      include: { user: true, paymentMethod: true, orderItems: true },
    });

    if (!order) {
      throw new NotFoundException('Order tidak ditemukan atau Anda tidak memiliki izin.');
    }
    if (order.paymentStatus !== PaymentStatus.PENDING_PAYMENT) {
      throw new BadRequestException('Pembayaran hanya bisa dicoba ulang untuk order yang menunggu pembayaran.');
    }
    if (!order.paymentMethod) {
      throw new BadRequestException('Metode pembayaran tidak ditemukan untuk order ini.');
    }

    switch (order.paymentMethod.code) {
      case 'midtrans': {
        const itemDetails = order.orderItems.map(item => {
            const productName = (item.productName as any)?.en || 'Product';
            if (!item.productId) {
                throw new BadRequestException(`Produk ${productName} tidak memiliki ID yang valid.`);
            }
            return {
                id: `PROD-${item.productId}`,
                price: Math.round(item.price),
                quantity: item.qty,
                name: productName,
            };
        });
        if (order.shippingCost > 0) {
            itemDetails.push({ id: 'SHIPPING', price: Math.round(order.shippingCost), quantity: 1, name: 'Shipping Cost' });
        }
        const newMidtransOrderId = `ORDER-${order.id}-RETRY-${Date.now()}`;
        if (order.paymentMethodId === null) {
            throw new BadRequestException('ID metode pembayaran hilang.');
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
      }

      case 'bank_transfer':
      case 'wise': {
        const configObject = typeof order.paymentMethod.config === 'object' && order.paymentMethod.config !== null 
            ? order.paymentMethod.config 
            : {};
        const instructions = { 
            ...configObject, 
            amount: order.total, 
            paymentDueDate: order.paymentDueDate 
        };
        const orderWithProducts = {
            ...order,
            orderItems: await Promise.all(
                order.orderItems.map(async (item) => ({
                    ...item,
                    product: item.productId
                        ? await this.prisma.product.findUnique({ where: { id: item.productId } })
                        : null,
                }))
            ),
        };
        const mappedOrder = mapOrderToDto(orderWithProducts as OrderWithDetails);
        if (!mappedOrder) {
            throw new InternalServerErrorException('Gagal memproses detail order.');
        }
        return { 
            ...mappedOrder, 
            paymentType: 'MANUAL', 
            instructions 
        };
      }

      case 'paypal':
        throw new BadRequestException('Pembayaran PayPal tidak dapat dicoba ulang. Silakan buat pesanan baru.');

      default:
        throw new BadRequestException(`Pembayaran ulang tidak didukung untuk metode '${order.paymentMethod.name}'.`);
    }
  }
  
  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredOrders() {
    this.logger.log('Menjalankan cron job untuk memeriksa order kedaluwarsa...');
    const expiredOrders = await this.prisma.order.findMany({
      where: { 
        orderStatus: OrderStatus.PENDING, // Seharusnya PENDING, bukan PENDING_PAYMENT
        paymentStatus: PaymentStatus.PENDING_PAYMENT,
        paymentDueDate: { lt: new Date() } 
      },
      include: { orderItems: true },
    });

    if (expiredOrders.length > 0) {
      this.logger.log(`Ditemukan ${expiredOrders.length} order kedaluwarsa. Memproses...`);
      for (const order of expiredOrders) {
        await this.prisma.$transaction(async (tx) => {
          await tx.order.update({ 
            where: { id: order.id }, 
            data: { 
                paymentStatus: PaymentStatus.EXPIRED, // Gunakan status EXPIRED
                orderStatus: OrderStatus.CANCELLED 
            } 
          });
          for (const item of order.orderItems) {
            if (item.productId) {
              await tx.product.update({ where: { id: item.productId }, data: { stock: { increment: item.qty } } });
            }
          }
        });
        this.logger.log(`Order #${order.id} kedaluwarsa. Status diubah ke EXPIRED/CANCELLED dan stok dikembalikan.`);
      }
    } else {
      this.logger.log('Tidak ada order kedaluwarsa yang ditemukan.');
    }
  }
}

// --- FUNGSI HELPER YANG DIREVISI ---
const mapOrderToDto = (order: OrderWithDetails | null): OrderResponseDto | null => {
  if (!order) return null;

  return {
    id: order.id,
    address: order.address,
    shippingCost: order.shippingCost,
    subtotal: order.subtotal,
    total: order.total,
    currencyCode: order.currencyCode,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    paymentDueDate: order.paymentDueDate ?? undefined,
    orderItems: order.orderItems.map((item) => {
      // --- INI ADALAH LOGIKA PENGAMBILAN DATA HIBRIDA ---
      const isProductAvailable = !!item.product;
      return {
        id: item.id,
        qty: item.qty,
        price: item.price,
        subtotal: item.subtotal,
        // Gunakan data LIVE jika produk ada, jika tidak, gunakan data SNAPSHOT
        productName: isProductAvailable && item.product ? (item.product.name as any) : (item.productName as any),
        productVariant: isProductAvailable && item.product ? (item.product.variant as any) : (item.productVariant as any),
        productImage: isProductAvailable && item.product
          ? item.product.images[0]?.url
          : item.productImage === null
            ? undefined
            : item.productImage,
        // Kirim data produk minimalis jika ada
        product: isProductAvailable && item.product
          ? { id: item.product.id, name: (item.product.name as any) }
          : undefined,
      };
    }),
    paymentMethod: order.paymentMethod ? {
      id: order.paymentMethod.id,
      name: order.paymentMethod.name,
      code: order.paymentMethod.code,
    } : undefined,
    user: {
      id: order.user.id,
      name: order.user.name,
      email: order.user.email,
    },
  };
};
// src/dashboard/dashboard.service.ts
import { Injectable, Logger } from '@nestjs/common'; // <-- 1. Tambahkan Logger
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class DashboardService {
  // --- 2. Inisialisasi Logger ---
  private readonly logger = new Logger(DashboardService.name);

  constructor(private prisma: PrismaService) {}

  async getDashboardData() {
    this.logger.log('Memulai proses getDashboardData...');
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    try {
      const [
        orderStats,
        hourlyRevenueData,
        bestProducts
      ] = await Promise.all([
        this.getOrderStats(todayStart, todayEnd),
        this.getHourlyRevenue(todayStart, todayEnd),
        this.getBestProducts(),
      ]);
      
      this.logger.log('Data mentah berhasil diambil, memformat data pendapatan...');
      const dailyRevenue = this.formatHourlyRevenue(hourlyRevenueData);

      this.logger.log('Berhasil mengambil dan memformat semua data dashboard.');
      return {
        orderStats,
        dailyRevenue,
        bestProducts,
      };
    } catch (error) {
      this.logger.error('Gagal mengambil data dashboard.', error.stack);
      // Lemparkan kembali error agar NestJS Exception Filter bisa menanganinya
      throw error;
    }
  }

  private async getOrderStats(start: Date, end: Date) {
    this.logger.log('Mengambil statistik order...');
    const [processing, shipping, completed] = await Promise.all([
      this.prisma.order.count({
        where: { createdAt: { gte: start, lte: end }, orderStatus: OrderStatus.PROCESSING },
      }),
      this.prisma.order.count({
        where: { createdAt: { gte: start, lte: end }, orderStatus: OrderStatus.SHIPPING },
      }),
      this.prisma.order.count({
        where: {
          createdAt: { gte: start, lte: end },
          orderStatus: OrderStatus.COMPLETED,
          paymentStatus: PaymentStatus.PAID,
        },
      }),
    ]);
    this.logger.log(`Statistik order ditemukan: ${processing} diproses, ${shipping} dikirim, ${completed} selesai.`);
    return { processing, shipping, completed };
  }

  private async getHourlyRevenue(start: Date, end: Date): Promise<{ hour: number; total: number }[]> {
    this.logger.log('Mengambil data pendapatan per jam...');
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT
        EXTRACT(HOUR FROM "createdAt") as hour,
        COALESCE(SUM(total)::float, 0) as total
      FROM "Order"
      WHERE "createdAt" >= ${start}
        AND "createdAt" <= ${end}
        AND "paymentStatus" = ${PaymentStatus.PAID}::"PaymentStatus"
      GROUP BY EXTRACT(HOUR FROM "createdAt")
      ORDER BY hour;
    `;
    this.logger.log(`Data pendapatan per jam berhasil diambil, ditemukan ${result.length} entri.`);
    return result.map(r => ({ hour: r.hour, total: Number(r.total) }));
  }
  
  private formatHourlyRevenue(data: { hour: number; total: number }[]) {
    const revenueMap = new Map(data.map(item => [item.hour, item.total]));
    const formattedData: { hour: string; total: number }[] = [];
    for (let i = 0; i < 24; i++) {
      formattedData.push({
        hour: `${String(i).padStart(2, '0')}:00`,
        total: revenueMap.get(i) || 0,
      });
    }
    return formattedData;
  }

  private async getBestProducts() {
    this.logger.log('Mengambil data produk terlaris...');
    const products = await this.prisma.product.findMany({
      where: {
        isBestProduct: true,
        isActive: true,
      },
      include: {
        images: { take: 1 },
        prices: { include: { currency: true } },
        subCategory: { include: { category: true } },
        discounts: {
          where: {
            isActive: true,
            startDate: { lte: new Date() },
            endDate: { gte: new Date() },
          },
        },
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
    this.logger.log(`Ditemukan ${products.length} produk terlaris.`);
    return products;
  }

  async updateBestProducts(productIds: number[]) {
    this.logger.log(`Memulai proses update produk terlaris dengan ID: [${productIds.join(', ')}]`);
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        this.logger.log('Menonaktifkan semua produk terlaris yang ada...');
        await tx.product.updateMany({
          data: { isBestProduct: false },
        });

        if (productIds && productIds.length > 0) {
          this.logger.log(`Mengaktifkan ${productIds.length} produk terlaris baru...`);
          await tx.product.updateMany({
            where: {
              id: { in: productIds },
            },
            data: { isBestProduct: true },
          });
        }
        return { message: 'Best products updated successfully.' };
      });
      this.logger.log('Berhasil mengupdate produk terlaris.');
      return result;
    } catch (error) {
      this.logger.error('Gagal mengupdate produk terlaris.', error.stack);
      throw error;
    }
  }
}
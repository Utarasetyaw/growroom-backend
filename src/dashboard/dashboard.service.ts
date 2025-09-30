// src/dashboard/dashboard.service.ts
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  parseISO,
} from 'date-fns';
import { GetDashboardDataDto } from './dto/get-dashboard-data.dto';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private prisma: PrismaService) {}

  async getDashboardData(query: GetDashboardDataDto) {
    const { revenuePeriod = 'daily', startDate, endDate } = query;

    // Menentukan rentang tanggal berdasarkan filter dari query
    const dateRange = this.getDateRange(revenuePeriod, startDate, endDate);

    try {
      this.logger.log(
        `Mengambil data dashboard untuk periode: ${revenuePeriod}`,
      );

      const [orderStats, revenueData, bestProducts] = await Promise.all([
        // Statistik pesanan sekarang dihitung berdasarkan rentang tanggal yang dinamis
        this.getOrderStats(dateRange.start, dateRange.end),
        // Data pendapatan untuk grafik dihitung berdasarkan rentang tanggal yang dinamis
        this.getRevenueData(revenuePeriod, dateRange.start, dateRange.end),
        // Produk terlaris tidak terpengaruh oleh filter tanggal
        this.getBestProducts(),
      ]);

      return {
        orderStats,
        revenueData,
        bestProducts,
      };
    } catch (error) {
      this.logger.error('Gagal mengambil data dashboard.', error.stack);
      throw error;
    }
  }

  private getDateRange(period: string, startStr?: string, endStr?: string) {
    const now = new Date();
    switch (period) {
      case 'weekly':
        return {
          start: startOfWeek(now, { weekStartsOn: 1 }),
          end: endOfWeek(now, { weekStartsOn: 1 }),
        };
      case 'monthly':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'yearly':
        return { start: startOfYear(now), end: endOfYear(now) };
      case 'custom':
        if (!startStr || !endStr) {
          throw new BadRequestException(
            'Tanggal mulai dan tanggal akhir diperlukan untuk periode custom.',
          );
        }
        return { start: parseISO(startStr), end: endOfDay(parseISO(endStr)) };
      default: // daily
        return { start: startOfDay(now), end: endOfDay(now) };
    }
  }

  private async getRevenueData(period: string, start: Date, end: Date) {
    this.logger.log(
      `Mengambil data pendapatan untuk grafik periode: ${period}`,
    );

    let query;
    if (period === 'daily') {
      query = this.prisma.$queryRaw<any[]>`
        SELECT TO_CHAR(h.hour, 'FM00') || ':00' as period, COALESCE(SUM(o.total)::float, 0) as total
        FROM generate_series(0, 23) h(hour)
        LEFT JOIN "orders" o ON EXTRACT(HOUR FROM o."createdAt") = h.hour
            AND o."createdAt" BETWEEN ${start} AND ${end}
            AND o."paymentStatus" = ${PaymentStatus.PAID}::"PaymentStatus"
        GROUP BY h.hour ORDER BY h.hour;`;
    } else if (period === 'yearly') {
      query = this.prisma.$queryRaw<any[]>`
        SELECT TO_CHAR("createdAt", 'YYYY-MM') as period, COALESCE(SUM(total)::float, 0) as total
        FROM "orders" WHERE "createdAt" BETWEEN ${start} AND ${end} AND "paymentStatus" = ${PaymentStatus.PAID}::"PaymentStatus"
        GROUP BY period ORDER BY period;`;
    } else {
      // weekly, monthly, custom
      query = this.prisma.$queryRaw<any[]>`
        SELECT TO_CHAR("createdAt", 'YYYY-MM-DD') as period, COALESCE(SUM(total)::float, 0) as total
        FROM "orders" WHERE "createdAt" BETWEEN ${start} AND ${end} AND "paymentStatus" = ${PaymentStatus.PAID}::"PaymentStatus"
        GROUP BY period ORDER BY period;`;
    }
    return await query;
  }

  private async getOrderStats(start: Date, end: Date) {
    this.logger.log(
      `Mengambil statistik order dari ${start.toISOString()} hingga ${end.toISOString()}`,
    );
    const [processing, shipping, completed] = await Promise.all([
      this.prisma.order.count({
        where: {
          createdAt: { gte: start, lte: end },
          orderStatus: OrderStatus.PROCESSING,
        },
      }),
      this.prisma.order.count({
        where: {
          createdAt: { gte: start, lte: end },
          orderStatus: OrderStatus.SHIPPING,
        },
      }),
      this.prisma.order.count({
        where: {
          createdAt: { gte: start, lte: end },
          orderStatus: OrderStatus.COMPLETED,
          paymentStatus: PaymentStatus.PAID,
        },
      }),
    ]);
    this.logger.log(
      `Statistik order ditemukan: ${processing} diproses, ${shipping} dikirim, ${completed} selesai.`,
    );
    return { processing, shipping, completed };
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
        updatedAt: 'desc',
      },
    });
    this.logger.log(`Ditemukan ${products.length} produk terlaris.`);
    return products;
  }

  async updateBestProducts(productIds: number[]) {
    this.logger.log(
      `Memulai proses update produk terlaris dengan ID: [${productIds.join(', ')}]`,
    );
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        this.logger.log('Menonaktifkan semua produk terlaris yang ada...');
        await tx.product.updateMany({
          data: { isBestProduct: false },
        });

        if (productIds && productIds.length > 0) {
          this.logger.log(
            `Mengaktifkan ${productIds.length} produk terlaris baru...`,
          );
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

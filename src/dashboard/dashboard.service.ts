// src/dashboard/dashboard.service.ts

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import {
  startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, subWeeks,
  startOfMonth, endOfMonth, subMonths
} from 'date-fns';
import { DashboardQueryDto, RevenuePeriod } from './dto/dashboard-query.dto';

// Tipe untuk data pendapatan yang akan dikembalikan
type RevenueDataPoint = {
  period: string;
  total: number;
};

// Tipe untuk unit pengelompokan waktu di SQL
type GroupByUnit = 'hour' | 'day' | 'week' | 'month';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private prisma: PrismaService) { }

  // ▼▼▼ METHOD UTAMA YANG SUDAH DIREVISI TOTAL ▼▼▼
  async getDashboardData(query: DashboardQueryDto) {
    this.logger.log(`Memulai proses getDashboardData dengan filter: ${query.revenuePeriod}`);
    const now = new Date();
    let startDate: Date, endDate: Date;
    let groupBy: GroupByUnit;

    // Menentukan rentang tanggal dan pengelompokan berdasarkan query parameter
    switch (query.revenuePeriod) {
      case RevenuePeriod.WEEKLY:
        startDate = startOfDay(subDays(now, 6)); // 7 hari terakhir termasuk hari ini
        endDate = endOfDay(now);
        groupBy = 'day';
        break;

      case RevenuePeriod.MONTHLY:
        startDate = startOfWeek(subWeeks(now, 3)); // 4 minggu terakhir
        endDate = endOfWeek(now);
        groupBy = 'week';
        break;

      case RevenuePeriod.YEARLY:
        startDate = startOfMonth(subMonths(now, 11)); // 12 bulan terakhir
        endDate = endOfMonth(now);
        groupBy = 'month';
        break;

      case RevenuePeriod.CUSTOM:
        if (!query.startDate || !query.endDate) {
          throw new BadRequestException('startDate dan endDate diperlukan untuk periode custom.');
        }
        startDate = startOfDay(new Date(query.startDate));
        endDate = endOfDay(new Date(query.endDate));
        groupBy = 'day';
        break;

      case RevenuePeriod.DAILY:
      default:
        startDate = startOfDay(now);
        endDate = endOfDay(now);
        groupBy = 'hour';
        break;
    }

    try {
      // Data omzet hari ini (untuk stat card) selalu dihitung untuk hari ini saja
      const todaysRevenue = await this.getRevenueData(startOfDay(now), endOfDay(now), 'hour');

      const [orderStats, revenueData, bestProducts] = await Promise.all([
        this.getOrderStats(startDate, endDate), // orderStats mengikuti rentang filter
        this.getRevenueData(startDate, endDate, groupBy), // revenueData untuk grafik, mengikuti filter
        this.getBestProducts(), // bestProducts tidak terpengaruh filter waktu
      ]);

      this.logger.log('Berhasil mengambil dan memformat semua data dashboard.');
      return {
        orderStats,
        dailyRevenue: todaysRevenue, // Untuk stat card 'Omzet Hari Ini'
        revenueData: revenueData,    // Untuk grafik dinamis
        bestProducts,
      };
    } catch (error) {
      this.logger.error('Gagal mengambil data dashboard.', error.stack);
      throw error;
    }
  }
  
  private async getOrderStats(start: Date, end: Date) {
    this.logger.log(`Mengambil statistik order dari ${start.toISOString()} hingga ${end.toISOString()}`);
    const [processing, shipping, completed] = await Promise.all([
      this.prisma.order.count({ where: { createdAt: { gte: start, lte: end }, orderStatus: OrderStatus.PROCESSING } }),
      this.prisma.order.count({ where: { createdAt: { gte: start, lte: end }, orderStatus: OrderStatus.SHIPPING } }),
      this.prisma.order.count({ where: { createdAt: { gte: start, lte: end }, orderStatus: OrderStatus.COMPLETED, paymentStatus: PaymentStatus.PAID } }),
    ]);
    return { processing, shipping, completed };
  }

  // ▼▼▼ FUNGSI BARU YANG FLEKSIBEL (MENGGANTIKAN getHourlyRevenue) ▼▼▼
  private async getRevenueData(start: Date, end: Date, groupBy: GroupByUnit): Promise<RevenueDataPoint[]> {
    this.logger.log(`Mengambil data pendapatan dari ${start.toISOString()} hingga ${end.toISOString()} dikelompokkan per-${groupBy}`);
    
    // Menggunakan DATE_TRUNC dari PostgreSQL untuk mengelompokkan waktu secara dinamis
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT
        DATE_TRUNC(${groupBy}, "createdAt") as period,
        COALESCE(SUM(total)::float, 0) as total
      FROM "orders"
      WHERE "createdAt" >= ${start}
        AND "createdAt" <= ${end}
        AND "paymentStatus" = ${PaymentStatus.PAID}::"PaymentStatus"
      GROUP BY period
      ORDER BY period ASC;
    `;
    this.logger.log(`Data pendapatan berhasil diambil, ditemukan ${result.length} entri.`);
    
    // Format output agar konsisten dan mudah dibaca oleh frontend
    return result.map(r => ({
      period: this.formatPeriod(new Date(r.period), groupBy),
      total: Number(r.total)
    }));
  }

  // ▼▼▼ FUNGSI HELPER BARU (MENGGANTIKAN formatHourlyRevenue) ▼▼▼
  private formatPeriod(date: Date, groupBy: GroupByUnit): string {
    switch (groupBy) {
      case 'hour':
        return `${String(date.getUTCHours()).padStart(2, '0')}:00`;
      case 'day':
        // Format YYYY-MM-DD
        return date.toISOString().split('T')[0];
      case 'week':
        // Format YYYY-MM-DD (tanggal pertama minggu itu)
        return startOfWeek(date, { weekStartsOn: 1 }).toISOString().split('T')[0];
      case 'month':
        // Format YYYY-MM
        return date.toISOString().slice(0, 7);
      default:
        return date.toISOString();
    }
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
        await tx.product.updateMany({
          data: { isBestProduct: false },
        });

        if (productIds && productIds.length > 0) {
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
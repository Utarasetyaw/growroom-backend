// src/dashboard/dashboard.service.ts

import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, PaymentStatus, Role } from '@prisma/client';
import {
  startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, subWeeks,
  startOfMonth, endOfMonth, subMonths, eachDayOfInterval, eachHourOfInterval,
  eachWeekOfInterval, eachMonthOfInterval, format, getWeekOfMonth, startOfYear, endOfYear
} from 'date-fns';
import { id as localeID } from 'date-fns/locale'; // Import locale Indonesia
import { DashboardQueryDto, RevenuePeriod } from './dto/dashboard-query.dto';

type RevenueDataPoint = {
  period: string;
  total: number;
};

type GroupByUnit = 'hour' | 'day' | 'week' | 'month';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private prisma: PrismaService) { }

  async getDashboardData(query: DashboardQueryDto) {
    this.logger.log(`Memulai proses getDashboardData dengan filter: ${query.revenuePeriod}`);
    const now = new Date();
    let startDate: Date, endDate: Date;
    let groupBy: GroupByUnit;

    // Menentukan rentang tanggal dan pengelompokan berdasarkan query parameter
    switch (query.revenuePeriod) {
      case RevenuePeriod.WEEKLY:
        startDate = startOfWeek(now, { weekStartsOn: 1 }); // Mulai dari Senin
        endDate = endOfWeek(now, { weekStartsOn: 1 }); // Selesai di Minggu
        groupBy = 'day';
        break;
      case RevenuePeriod.MONTHLY:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
        groupBy = 'week';
        break;
      case RevenuePeriod.YEARLY:
        startDate = startOfYear(now);
        endDate = endOfYear(now);
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
      const todaysRevenue = await this.getRawRevenueData(startOfDay(now), endOfDay(now), 'hour');
      const [orderStats, rawRevenueData, bestProducts] = await Promise.all([
        this.getOrderStats(startDate, endDate),
        this.getRawRevenueData(startDate, endDate, groupBy),
        this.getBestProducts(),
      ]);
      
      const filledRevenueData = this.fillMissingRevenueData(rawRevenueData, startDate, endDate, groupBy);

      this.logger.log('Berhasil mengambil dan melengkapi semua data dashboard.');
      return {
        orderStats,
        dailyRevenue: todaysRevenue,
        revenueData: filledRevenueData,
        bestProducts,
      };
    } catch (error) {
      this.logger.error('Gagal mengambil data dashboard.', error.stack);
      throw error;
    }
  }

  private fillMissingRevenueData(
    rawData: RevenueDataPoint[],
    startDate: Date,
    endDate: Date,
    groupBy: GroupByUnit
  ): RevenueDataPoint[] {
    const dataMap = new Map(rawData.map(item => [item.period, item.total]));
    const result: RevenueDataPoint[] = [];

    switch (groupBy) {
      case 'hour': // Untuk Harian
        const hours = eachHourOfInterval({ start: startDate, end: endDate });
        hours.forEach(hour => {
          const periodKey = format(hour, 'yyyy-MM-dd HH');
          const label = format(hour, 'HH:00');
          result.push({ period: label, total: dataMap.get(periodKey) || 0 });
        });
        break;

      case 'day': // Untuk Mingguan dan Custom
        const days = eachDayOfInterval({ start: startDate, end: endDate });
        days.forEach(day => {
          const periodKey = format(day, 'yyyy-MM-dd');
          const isWeeklyView = (endDate.getTime() - startDate.getTime()) < (8 * 24 * 60 * 60 * 1000);
          const label = isWeeklyView
            ? format(day, 'EEEE', { locale: localeID }) // Nama hari (Senin, Selasa)
            : format(day, 'yyyy-MM-dd'); // Tanggal
          result.push({ period: label, total: dataMap.get(periodKey) || 0 });
        });
        break;

      case 'week': // Untuk Bulanan
        const weeks = eachWeekOfInterval({ start: startDate, end: endDate }, { weekStartsOn: 1 });
        weeks.forEach(weekStart => {
          const periodKey = format(weekStart, 'yyyy-MM-dd');
          const weekNumber = getWeekOfMonth(weekStart, { weekStartsOn: 1 });
          const label = `Minggu ${weekNumber}`;
          result.push({ period: label, total: dataMap.get(periodKey) || 0 });
        });
        break;

      case 'month': // Untuk Tahunan
        const months = eachMonthOfInterval({ start: startDate, end: endDate });
        months.forEach(monthStart => {
          const periodKey = format(monthStart, 'yyyy-MM');
          const label = format(monthStart, 'MMMM', { locale: localeID }); // Nama bulan (Januari)
          result.push({ period: label, total: dataMap.get(periodKey) || 0 });
        });
        break;
    }
    return result;
  }
  
  private async getRawRevenueData(start: Date, end: Date, groupBy: GroupByUnit): Promise<RevenueDataPoint[]> {
    this.logger.log(`Mengambil data mentah pendapatan dari ${start.toISOString()} hingga ${end.toISOString()} per-${groupBy}`);
    
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
    
    return result.map(r => {
      let periodKey = '';
      const date = new Date(r.period);
      if (groupBy === 'hour') periodKey = format(date, 'yyyy-MM-dd HH');
      else if (groupBy === 'day') periodKey = format(date, 'yyyy-MM-dd');
      else if (groupBy === 'week') periodKey = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      else if (groupBy === 'month') periodKey = format(date, 'yyyy-MM');
      
      return {
        period: periodKey,
        total: Number(r.total)
      }
    });
  }

  private async getOrderStats(start: Date, end: Date) {
    this.logger.log(`Mengambil statistik order dari ${start.toISOString()} hingga ${end.toISOString()}`);
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
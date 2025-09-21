import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { startOfDay, endOfDay } from 'date-fns';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getDashboardData() {
    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const [
      orderStats,
      hourlyRevenueData,
      bestProducts
    ] = await Promise.all([
      this.getOrderStats(todayStart, todayEnd),
      this.getHourlyRevenue(todayStart, todayEnd),
      this.getBestProducts(),
    ]);
    
    const dailyRevenue = this.formatHourlyRevenue(hourlyRevenueData);

    return {
      orderStats,
      dailyRevenue,
      bestProducts,
    };
  }

  private async getOrderStats(start: Date, end: Date) {
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

    return { processing, shipping, completed };
  }

  /**
   * Mengambil total pendapatan yang dikelompokkan per jam.
   */
  private async getHourlyRevenue(start: Date, end: Date): Promise<{ hour: number; total: number }[]> {
    // --- PERBAIKAN DI SINI ---
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
    // Memastikan tipe data 'total' adalah number
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
    return this.prisma.product.findMany({
      where: {
        isBestProduct: true,
        isActive: true,
      },
      include: {
        images: { take: 1 },
        prices: { include: { currency: true } },
        subCategory: { include: { category: true } }, // Include category for breadcrumbs if needed
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
  }

  async updateBestProducts(productIds: number[]) {
    return this.prisma.$transaction(async (tx) => {
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
  }
}
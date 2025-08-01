// src/dashboard/dashboard.service.ts
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

    // 1. Ambil semua data secara paralel untuk efisiensi
    const [
      orderStats,
      hourlyRevenueData,
      bestProducts
    ] = await Promise.all([
      this.getOrderStats(todayStart, todayEnd),
      this.getHourlyRevenue(todayStart, todayEnd),
      this.getBestProducts(),
    ]);
    
    // 2. Format data pendapatan per jam
    const dailyRevenue = this.formatHourlyRevenue(hourlyRevenueData);

    return {
      orderStats,
      dailyRevenue,
      bestProducts,
    };
  }

  /**
   * Mengambil jumlah order berdasarkan status untuk rentang waktu tertentu.
   */
  private async getOrderStats(start: Date, end: Date) {
    const [processing, shipping, completed] = await Promise.all([
      // Order masuk (masih diproses)
      this.prisma.order.count({
        where: { createdAt: { gte: start, lte: end }, orderStatus: OrderStatus.PROCESSING },
      }),
      // Order sedang dikirim
      this.prisma.order.count({
        where: { createdAt: { gte: start, lte: end }, orderStatus: OrderStatus.SHIPPING },
      }),
      // Order selesai (sudah dibayar dan status completed)
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
    const result = await this.prisma.$queryRaw<any[]>`
      SELECT
        EXTRACT(HOUR FROM "createdAt") as hour,
        SUM(total)::float as total
      FROM "Order"
      WHERE "createdAt" >= ${start}
        AND "createdAt" <= ${end}
        AND "paymentStatus" = ${PaymentStatus.PAID}::"PaymentStatus"
      GROUP BY EXTRACT(HOUR FROM "createdAt")
      ORDER BY hour;
    `;
    return result;
  }
  
  /**
   * Memformat data pendapatan agar lengkap dari jam 00 hingga 23.
   */
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

  /**
   * Mengambil semua produk yang ditandai sebagai 'isBestProduct'.
   */
  private async getBestProducts() {
    return this.prisma.product.findMany({
      where: {
        isBestProduct: true,
        isActive: true,
      },
      include: {
        images: true,
        prices: { include: { currency: true } },
        subCategory: true,
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });
  }

  /**
   * Mengatur ulang dan menetapkan produk mana yang menjadi produk unggulan.
   * @param productIds Array dari ID produk yang dipilih.
   */
  async updateBestProducts(productIds: number[]) {
    // Gunakan transaksi untuk memastikan kedua operasi berhasil atau gagal bersamaan
    return this.prisma.$transaction(async (tx) => {
      // 1. Set semua produk menjadi BUKAN produk unggulan
      await tx.product.updateMany({
        data: { isBestProduct: false },
      });

      // 2. Set produk yang dipilih menjadi produk unggulan
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

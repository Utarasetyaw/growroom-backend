// src/dashboard/dto/dashboard-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { ProductResponseDto } from '../../products/dto/product-response.dto'; // Asumsi path ini benar

class OrderStatsDto {
  @ApiProperty({ description: 'Order baru yang masih diproses hari ini.', example: 5 })
  processing: number;

  @ApiProperty({ description: 'Order yang sedang dalam pengiriman hari ini.', example: 3 })
  shipping: number;

  @ApiProperty({ description: 'Order yang sudah selesai hari ini.', example: 10 })
  completed: number;
}

class DailyRevenueDto {
  @ApiProperty({ description: 'Jam dalam format 24 jam (misal: 14 untuk jam 2 siang).', example: '14:00' })
  hour: string;

  @ApiProperty({ description: 'Total pendapatan pada jam tersebut.', example: 750000 })
  total: number;
}

export class DashboardResponseDto {
  @ApiProperty({ description: 'Statistik jumlah order hari ini.' })
  orderStats: OrderStatsDto;

  @ApiProperty({ description: 'Data pendapatan per jam untuk hari ini.', type: [DailyRevenueDto] })
  dailyRevenue: DailyRevenueDto[];

  @ApiProperty({ description: 'Daftar produk yang ditandai sebagai unggulan.', type: [ProductResponseDto] })
  bestProducts: ProductResponseDto[];
}
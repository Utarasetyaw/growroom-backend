// src/dashboard/dto/dashboard-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { ProductResponseDto } from '../../products/dto/product-response.dto';

class OrderStatsDto {
  @ApiProperty({
    description: 'Order yang masih diproses sesuai filter.',
    example: 5,
  })
  processing: number;

  @ApiProperty({
    description: 'Order yang sedang dalam pengiriman sesuai filter.',
    example: 3,
  })
  shipping: number;

  @ApiProperty({
    description: 'Order yang sudah selesai sesuai filter.',
    example: 10,
  })
  completed: number;
}

class DailyRevenueDto {
  @ApiProperty({
    description: 'Jam dalam format 24 jam (misal: "14:00").',
    example: '14:00',
  })
  hour: string;

  @ApiProperty({
    description: 'Total pendapatan pada jam tersebut.',
    example: 750000,
  })
  total: number;
}

class RevenueDataDto {
  @ApiProperty({
    description: 'Periode waktu (bisa jam, tanggal, atau bulan-tahun).',
    example: '2025-09-30',
  })
  period: string;

  @ApiProperty({
    description: 'Total pendapatan pada periode tersebut.',
    example: 1500000,
  })
  total: number;
}

export class DashboardResponseDto {
  @ApiProperty({
    description: 'Statistik jumlah order berdasarkan filter yang dipilih.',
  })
  orderStats: OrderStatsDto;

  @ApiProperty({
    description:
      'Data pendapatan per jam khusus untuk hari ini (digunakan untuk kartu statistik).',
    type: [DailyRevenueDto],
  })
  dailyRevenue: DailyRevenueDto[];

  @ApiProperty({
    description:
      'Data pendapatan dinamis sesuai filter (digunakan untuk grafik).',
    type: [RevenueDataDto],
  })
  revenueData: RevenueDataDto[];

  @ApiProperty({
    description: 'Daftar produk yang ditandai sebagai unggulan.',
    type: [ProductResponseDto],
  })
  bestProducts: ProductResponseDto[];
}

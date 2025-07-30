import { ApiProperty } from '@nestjs/swagger';

export class ChartResponseDto {
  @ApiProperty({ description: 'Label waktu (hari, minggu, atau bulan).', example: '2025-07-30' })
  label: string;

  @ApiProperty({ description: 'Total omset pada label waktu tersebut.', example: 500000 })
  omset: number;

  @ApiProperty({ description: 'Jumlah pesanan pada label waktu tersebut.', example: 5 })
  count: number;
}
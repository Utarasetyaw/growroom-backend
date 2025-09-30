import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsIn, IsDateString } from 'class-validator';

export class GetDashboardDataDto {
  @ApiPropertyOptional({
    description: 'Periode waktu untuk filter grafik pendapatan.',
    enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom'],
    default: 'daily',
  })
  @IsOptional()
  @IsIn(['daily', 'weekly', 'monthly', 'yearly', 'custom'])
  revenuePeriod?: string;

  @ApiPropertyOptional({
    description: 'Tanggal mulai untuk periode custom (format ISO 8601).',
    example: '2025-09-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Tanggal akhir untuk periode custom (format ISO 8601).',
    example: '2025-09-30T23:59:59.000Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}

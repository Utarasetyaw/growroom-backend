// src/dashboard/dto/dashboard-query.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, ValidateIf } from 'class-validator';

// Enum untuk memastikan nilai revenuePeriod adalah salah satu dari yang kita harapkan
export enum RevenuePeriod {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

export class DashboardQueryDto {
  @ApiPropertyOptional({
    enum: RevenuePeriod,
    default: RevenuePeriod.DAILY,
    description: 'Periode waktu untuk data pendapatan.',
  })
  @IsOptional()
  @IsEnum(RevenuePeriod)
  revenuePeriod?: RevenuePeriod = RevenuePeriod.DAILY;

  @ApiPropertyOptional({
    description: 'Tanggal mulai untuk periode custom (format ISO 8601). Diperlukan jika revenuePeriod adalah custom.',
    example: '2025-09-01T00:00:00.000Z',
  })
  @ValidateIf(o => o.revenuePeriod === RevenuePeriod.CUSTOM) // Validasi hanya jika periodenya custom
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({
    description: 'Tanggal akhir untuk periode custom (format ISO 8601). Diperlukan jika revenuePeriod adalah custom.',
    example: '2025-09-30T23:59:59.999Z',
  })
  @ValidateIf(o => o.revenuePeriod === RevenuePeriod.CUSTOM)
  @IsDateString()
  endDate?: string;
}
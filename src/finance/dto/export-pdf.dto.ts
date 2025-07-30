import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class ExportPdfDto {
  @ApiProperty({ description: 'Tanggal mulai laporan (format YYYY-MM-DD).', example: '2025-07-01' })
  @IsDateString()
  start: string;

  @ApiProperty({ description: 'Tanggal akhir laporan (format YYYY-MM-DD).', example: '2025-07-30' })
  @IsDateString()
  end: string;
}
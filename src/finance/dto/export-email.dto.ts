import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';
import { ExportPdfDto } from './export-pdf.dto';

export class ExportEmailDto extends ExportPdfDto {
  @ApiProperty({ description: 'Alamat email tujuan untuk pengiriman laporan.', example: 'admin@example.com' })
  @IsEmail()
  email: string;
}
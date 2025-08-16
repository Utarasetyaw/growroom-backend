import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty } from 'class-validator';

export class ExportPdfDto {
  @ApiProperty({ 
    description: 'Tanggal mulai laporan (format YYYY-MM-DD).', 
    example: '2025-08-01' 
  })
  @IsNotEmpty({ message: 'Tanggal mulai tidak boleh kosong.' }) // <-- REVISI
  @IsDateString({}, { message: 'Format tanggal mulai harus YYYY-MM-DD.' })
  start: string;

  @ApiProperty({ 
    description: 'Tanggal akhir laporan (format YYYY-MM-DD).', 
    example: '2025-08-16' 
  })
  @IsNotEmpty({ message: 'Tanggal akhir tidak boleh kosong.' }) // <-- REVISI
  @IsDateString({}, { message: 'Format tanggal akhir harus YYYY-MM-DD.' })
  end: string;
}
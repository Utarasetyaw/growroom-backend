import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsOptional } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Nama kategori dalam berbagai bahasa. Kunci adalah kode bahasa (id, en, dll).',
    example: { id: 'Pakaian Pria', en: "Men's Wear" },
  })
  @IsNotEmpty()
  @IsObject()
  name: Record<string, string>;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'File gambar opsional untuk kategori.',
  })
  @IsOptional()
  image?: any;
}
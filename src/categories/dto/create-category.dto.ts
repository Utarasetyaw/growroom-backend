import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Nama kategori dalam berbagai bahasa. Kunci adalah kode bahasa (id, en, dll).',
    example: { "id": "Pakaian Pria", "en": "Men's Wear" },
  })
  @IsNotEmpty()
  @IsObject()
  name: Record<string, string>;
}
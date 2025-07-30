import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsInt } from 'class-validator';

export class CreateSubcategoryDto {
  @ApiProperty({
    description: 'Nama sub-kategori dalam berbagai bahasa.',
    example: { "id": "Kemeja", "en": "Shirt" },
  })
  @IsNotEmpty()
  @IsObject()
  name: Record<string, string>;

  @ApiProperty({ description: 'ID dari kategori induk.', example: 1 })
  @IsNotEmpty()
  @IsInt()
  categoryId: number;
}
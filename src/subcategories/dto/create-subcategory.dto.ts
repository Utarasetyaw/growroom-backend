import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsObject, IsInt, IsOptional } from 'class-validator';

export class CreateSubcategoryDto {
  @ApiProperty({
    description: 'Nama sub-kategori dalam berbagai bahasa.',
    example: { id: 'Kemeja', en: 'Shirt' },
  })
  @IsNotEmpty()
  @IsObject()
  name: Record<string, string>;

  @ApiProperty({
    description: 'ID dari kategori induk tempat sub-kategori ini bernaung.',
    example: 1,
  })
  @IsNotEmpty()
  @IsInt()
  categoryId: number;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'File gambar opsional untuk sub-kategori.',
  })
  @IsOptional()
  image?: any;
}
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO internal untuk merepresentasikan data kategori induk
 * yang disematkan dalam respons SubCategory.
 */
class CategoryInSubDto {
  @ApiProperty({
    description: 'ID unik dari kategori induk.',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Nama kategori induk dalam berbagai bahasa.',
    example: { id: 'Pakaian Pria', en: "Men's Wear" },
  })
  name: any;

  @ApiPropertyOptional({
    description: 'URL gambar dari kategori induk (jika ada).',
    example: '/uploads/categories/parentimage.jpg',
  })
  imageUrl?: string;
}

/**
 * DTO utama untuk respons endpoint Sub-Kategori.
 */
export class SubcategoryResponseDto {
  @ApiProperty({
    description: 'ID unik dari sub-kategori.',
    example: 10,
  })
  id: number;

  @ApiProperty({
    description: 'Nama sub-kategori dalam berbagai bahasa.',
    example: { id: 'Kemeja', en: 'Shirt' },
  })
  name: any;

  @ApiPropertyOptional({
    description: 'URL gambar untuk sub-kategori (jika ada).',
    example: '/uploads/subcategories/subcategoryimage.png',
  })
  imageUrl?: string;

  @ApiProperty({
    description: 'ID dari kategori induk.',
    example: 1,
  })
  categoryId: number;

  @ApiProperty({
    type: CategoryInSubDto,
    description: 'Objek detail dari kategori induk.',
  })
  category: CategoryInSubDto;
}
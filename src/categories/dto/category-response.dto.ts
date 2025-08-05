import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO internal untuk mendefinisikan struktur data sub-kategori 
 * yang akan ditampilkan di dalam respons Kategori.
 */
class SubCategoryDto {
    @ApiProperty({ 
        example: 10, 
        description: 'ID unik dari sub-kategori.' 
    })
    id: number;

    @ApiProperty({ 
        example: { id: "Kemeja", en: "Shirt" }, 
        description: 'Nama sub-kategori dalam berbagai bahasa.' 
    })
    name: Record<string, string>;

    @ApiPropertyOptional({
        description: 'URL gambar untuk sub-kategori (jika ada).',
        example: '/uploads/subcategories/randomname.jpg'
    })
    imageUrl?: string;
}

/**
 * DTO utama untuk respons endpoint Kategori. 
 * Ini mendefinisikan data lengkap dari sebuah kategori, termasuk daftar sub-kategorinya.
 */
export class CategoryResponseDto {
  @ApiProperty({ 
      example: 1, 
      description: 'ID unik dari kategori.' 
    })
  id: number;

  @ApiProperty({ 
      example: { "id": "Pakaian Pria", "en": "Men's Wear" }, 
      description: 'Nama kategori dalam berbagai bahasa.' 
    })
  name: Record<string, string>;

  @ApiPropertyOptional({
      description: 'URL gambar untuk kategori (jika ada).',
      example: '/uploads/categories/anotherrandom.png'
  })
  imageUrl?: string;

  @ApiProperty({ 
      type: [SubCategoryDto], 
      description: 'Daftar sub-kategori yang berada di bawah kategori ini.' 
    })
  subCategories: SubCategoryDto[];
}
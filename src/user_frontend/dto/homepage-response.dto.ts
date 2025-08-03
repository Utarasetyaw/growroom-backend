import { ApiProperty } from '@nestjs/swagger';

// Impor DTO yang sudah ada dari modul lain
// Pastikan path-nya sesuai dengan struktur folder Anda
import { CategoryResponseDto } from '../../categories/dto/category-response.dto';
import { ProductResponseDto } from '../../products/dto/product-response.dto';
import { TestimonialResponseDto } from '../../testimonials/dto/testimonial-response.dto';

// DTO khusus untuk general settings yang tampil di homepage
class HomepageGeneralSettingsDto {
  @ApiProperty({
    example: { id: 'Glow-Room', en: 'Glow-Room' },
    description: 'Nama toko dalam berbagai bahasa',
  })
  shopName: Record<string, string>;

  @ApiProperty({
    example: '/uploads/generalsetting/banner.jpg',
    description: 'URL gambar banner',
    required: false,
  })
  bannerImageUrl?: string;

  @ApiProperty({
    example: '/uploads/generalsetting/banner.mp4',
    description: 'URL video banner',
    required: false,
  })
  bannerVideoUrl?: string;
}

// DTO utama untuk seluruh respons homepage
export class HomepageResponseDto {
  @ApiProperty({ type: [CategoryResponseDto] })
  categories: CategoryResponseDto[];

  @ApiProperty({ type: [ProductResponseDto] })
  bestProducts: ProductResponseDto[];

  @ApiProperty({ type: [TestimonialResponseDto] })
  testimonials: TestimonialResponseDto[];

  @ApiProperty({ type: HomepageGeneralSettingsDto })
  generalSettings: HomepageGeneralSettingsDto;
}
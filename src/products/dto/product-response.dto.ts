import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// --- Nested DTOs for Response Clarity ---

class ImageDto {
  @ApiProperty() id: number;
  @ApiProperty() url: string;
}

class CurrencyDto {
  @ApiProperty() id: number;
  @ApiProperty() code: string;
  @ApiProperty() symbol: string;
}

class PriceDto {
  @ApiProperty() id: number;
  @ApiProperty() price: number;
  @ApiProperty({ type: () => CurrencyDto })
  currency: CurrencyDto;
}

class SubCategoryDto {
  @ApiProperty() id: number;
  // REVISI: Mengganti `any` dengan tipe yang lebih spesifik untuk dokumentasi
  @ApiProperty({ type: 'object', additionalProperties: { type: 'string' }, example: { id: 'Daun Lebar', en: 'Wide Leaf' } })
  name: Record<string, string>;
}

// REVISI: DTO baru untuk mendefinisikan struktur careDetails dalam response
class CareDetailResponseDto {
  @ApiProperty({ type: 'object', additionalProperties: { type: 'string' }, example: { id: 'Ukuran Pot', en: 'Pot Size' }})
  name: Record<string, string>;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'string' }, example: { id: '15 cm', en: '15 cm' }})
  value: Record<string, string>;
}


// --- Main Response DTO ---

export class ProductResponseDto {
  @ApiProperty() id: number;

  // REVISI: Tipe `any` diubah menjadi Record<string, string> untuk kejelasan
  @ApiProperty({ type: 'object', additionalProperties: { type: 'string' }})
  name: Record<string, string>;

  @ApiProperty({ type: 'object', additionalProperties: { type: 'string' }})
  variant: Record<string, string>;
  
  @ApiPropertyOptional({ type: 'object', additionalProperties: { type: 'string' }, description: "Deskripsi produk dalam berbagai bahasa." })
  description: Record<string, string> | null;

  @ApiProperty() stock: number;

  @ApiProperty({ nullable: true }) weight: number | null;

  // REVISI: Menggunakan DTO yang baru untuk careDetails
  @ApiPropertyOptional({ type: () => [CareDetailResponseDto], nullable: true, description: "Detail perawatan produk" })
  careDetails: CareDetailResponseDto[] | null;

  @ApiProperty() isBestProduct: boolean;

  @ApiProperty() isActive: boolean;

  @ApiProperty() createdAt: Date;

  @ApiProperty() updatedAt: Date;

  @ApiProperty({ type: () => [ImageDto] }) images: ImageDto[];

  @ApiProperty({ type: () => [PriceDto] }) prices: PriceDto[];

  @ApiProperty({ type: () => SubCategoryDto }) subCategory: SubCategoryDto;
}
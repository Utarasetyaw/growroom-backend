import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// --- DTO Pendukung untuk Respons ---

// DTO BARU: DTO yang bisa digunakan kembali untuk semua field multibahasa
class MultiLanguageObjectDto {
  @ApiPropertyOptional({ description: 'Teks dalam Bahasa Indonesia.' })
  id?: string;

  @ApiPropertyOptional({ description: 'Teks dalam Bahasa Inggris.' })
  en?: string;
}

class ImageDto {
  @ApiProperty({ description: 'ID unik dari gambar.' })
  id: number;

  @ApiProperty({ description: 'URL dari gambar produk.' })
  url: string;
}

class CurrencyDto {
  @ApiProperty({ description: 'ID unik dari mata uang.' })
  id: number;
  
  @ApiProperty({ description: 'Kode ISO mata uang (e.g., IDR, USD).', example: 'IDR' })
  code: string;

  @ApiProperty({ description: 'Simbol mata uang (e.g., Rp, $).', example: 'Rp' })
  symbol: string;
}

class PriceDto {
  @ApiProperty({ description: 'ID unik dari harga.' })
  id: number;

  @ApiProperty({ description: 'Nilai harga produk.' })
  price: number;
  
  @ApiProperty({ type: () => CurrencyDto, description: 'Detail mata uang terkait.' })
  currency: CurrencyDto;
}

class SubCategoryDto {
  @ApiProperty({ description: 'ID unik dari sub-kategori.' })
  id: number;
  
  // REVISI: Menggunakan DTO yang bisa digunakan kembali
  @ApiProperty({ type: MultiLanguageObjectDto, description: 'Nama sub-kategori dalam berbagai bahasa.' })
  name: MultiLanguageObjectDto;
}

class CareDetailResponseDto {
  // REVISI: Menggunakan DTO yang bisa digunakan kembali
  @ApiProperty({ type: MultiLanguageObjectDto, description: 'Nama detail perawatan (multibahasa).' })
  name: MultiLanguageObjectDto;

  // REVISI: Menggunakan DTO yang bisa digunakan kembali
  @ApiProperty({ type: MultiLanguageObjectDto, description: 'Nilai detail perawatan (multibahasa).' })
  value: MultiLanguageObjectDto;
}


// --- DTO Utama untuk Respons Produk ---

export class ProductResponseDto {
  @ApiProperty({ description: 'ID unik produk.' })
  id: number;

  // REVISI: Menggunakan DTO yang bisa digunakan kembali
  @ApiProperty({ type: MultiLanguageObjectDto, description: 'Nama produk dalam berbagai bahasa.' })
  name: MultiLanguageObjectDto;

  // REVISI: Menggunakan DTO yang bisa digunakan kembali
  @ApiProperty({ type: MultiLanguageObjectDto, description: 'Varian produk dalam berbagai bahasa.' })
  variant: MultiLanguageObjectDto;
  
  // REVISI: Menggunakan DTO yang bisa digunakan kembali
  @ApiPropertyOptional({ type: MultiLanguageObjectDto, description: "Deskripsi produk dalam berbagai bahasa." })
  description: MultiLanguageObjectDto | null;

  @ApiProperty({ description: 'Jumlah stok produk saat ini.' })
  stock: number;

  @ApiProperty({ description: 'Berat produk dalam gram.', nullable: true })
  weight: number | null;

  @ApiPropertyOptional({ type: () => [CareDetailResponseDto], description: "Detail perawatan produk.", nullable: true })
  careDetails: CareDetailResponseDto[] | null;

  @ApiProperty({ description: 'Menandakan apakah produk ini adalah produk unggulan.' })
  isBestProduct: boolean;

  @ApiProperty({ description: 'Menandakan apakah produk ini aktif dan ditampilkan.' })
  isActive: boolean;

  @ApiProperty({ description: 'Waktu produk dibuat.' })
  createdAt: Date;

  @ApiProperty({ description: 'Waktu produk terakhir diupdate.' })
  updatedAt: Date;

  @ApiProperty({ type: () => [ImageDto], description: 'Daftar gambar produk.' })
  images: ImageDto[];

  @ApiProperty({ type: () => [PriceDto], description: 'Daftar harga produk dalam berbagai mata uang.' })
  prices: PriceDto[];

  @ApiProperty({ type: () => SubCategoryDto, description: 'Sub-kategori tempat produk ini berada.' })
  subCategory: SubCategoryDto;
}
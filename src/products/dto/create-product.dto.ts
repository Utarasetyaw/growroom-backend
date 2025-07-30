import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsInt, IsOptional, IsBoolean, IsArray, IsObject, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class ProductPriceDto {
  @ApiProperty({ description: 'ID dari mata uang.', example: 1 })
  @IsInt() 
  currencyId: number;

  @ApiProperty({ description: 'Harga produk dalam mata uang terkait.', example: 250000 })
  @IsNumber() 
  price: number;
}

class ProductImageDto {
  @ApiProperty({ description: 'URL dari gambar produk.', example: '/uploads/products/image1.jpg' })
  @IsNotEmpty() 
  url: string;
}

export class CreateProductDto {
  @ApiProperty({ description: 'Nama produk dalam berbagai bahasa.', example: { id: "Kemeja Lengan Panjang", en: "Long Sleeve Shirt" } })
  @IsObject() 
  name: Record<string, string>;

  @ApiProperty({ description: 'Varian produk (warna/ukuran).', example: { id: "Biru", en: "Blue" } })
  @IsObject() 
  variant: Record<string, string>;

  @ApiProperty({ description: 'ID sub-kategori produk.', example: 5 })
  @IsInt() 
  subCategoryId: number;

  @ApiProperty({ description: 'Jumlah stok produk.', example: 100 })
  @IsInt() 
  stock: number;

  @ApiPropertyOptional({ description: 'Berat produk dalam gram (untuk ongkir).', example: 250 })
  @IsOptional() 
  @IsNumber() 
  weight?: number;

  @ApiPropertyOptional({ description: 'Detail perawatan dalam berbagai bahasa.', example: { id: "Cuci dengan air dingin", en: "Wash with cold water" } })
  @IsOptional() 
  @IsObject() 
  careDetails?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Tandai sebagai produk unggulan.', example: true })
  @IsOptional() 
  @IsBoolean() 
  isBestProduct?: boolean;

  @ApiPropertyOptional({ description: 'Status aktif produk.', example: true })
  @IsOptional() 
  @IsBoolean() 
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'List gambar produk.', type: [ProductImageDto] })
  @IsOptional() 
  @IsArray() 
  @ValidateNested({ each: true }) 
  @Type(() => ProductImageDto)
  images?: ProductImageDto[];

  @ApiProperty({ description: 'List harga produk dalam berbagai mata uang.', type: [ProductPriceDto] })
  @IsArray() 
  @ValidateNested({ each: true }) 
  @Type(() => ProductPriceDto)
  prices: ProductPriceDto[];
}
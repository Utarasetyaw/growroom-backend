// File: src/products/dto/create-product.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, IsInt, IsBoolean, IsOptional, Min, IsNumber, IsJSON } from 'class-validator';

// Fungsi bantuan untuk mengubah string JSON menjadi objek
const jsonTransformer = Transform(({ value }) => {
  try { return JSON.parse(value); } catch (e) { return value; }
});

export class CreateProductDto {
  @ApiProperty({ description: 'Nama produk (JSON string)', example: '{"en": "Product Name"}' })
  @jsonTransformer
  @IsJSON({ message: 'Nama produk harus berupa JSON string yang valid.' })
  name: any;

  @ApiProperty({ description: 'Varian produk (JSON string)', example: '{"en": "Variegated"}' })
  @jsonTransformer
  @IsJSON({ message: 'Varian produk harus berupa JSON string yang valid.' })
  variant: any;

  @ApiPropertyOptional({ description: 'Deskripsi produk (JSON string)' })
  @IsOptional()
  @jsonTransformer
  @IsJSON({ message: 'Deskripsi produk harus berupa JSON string yang valid.' })
  description?: any;

  @ApiProperty({ description: 'Jumlah stok produk', example: 100 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({ description: 'Berat produk dalam gram', example: 500 })
  @IsOptional()
  @Transform(({ value }) => value ? parseFloat(value) : null)
  @IsNumber()
  weight?: number;
  
  @ApiProperty({ description: 'Detail perawatan (JSON string)' })
  @jsonTransformer
  @IsJSON({ message: 'Detail perawatan harus berupa JSON string yang valid.' })
  careDetails: any;

  @ApiPropertyOptional({ description: 'Produk unggulan?', default: false, type: 'boolean' })
  @IsOptional()
  @Transform(({ value }) => String(value).toLowerCase() === 'true')
  @IsBoolean()
  isBestProduct?: boolean;

  @ApiPropertyOptional({ description: 'Produk aktif?', default: true, type: 'boolean' })
  @IsOptional()
  @Transform(({ value }) => String(value).toLowerCase() === 'true')
  @IsBoolean()
  isActive?: boolean;
  
  @ApiProperty({ description: 'ID sub-kategori', example: 1 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  subCategoryId: number;

  @ApiProperty({ description: 'Harga produk (JSON string)' })
  @jsonTransformer
  @IsJSON({ message: 'Harga produk harus berupa JSON string yang valid.' })
  prices: any;
}
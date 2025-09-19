// File: src/products/dto/create-product.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsString,
    IsInt,
    IsBoolean,
    IsOptional,
    Min,
    IsNumber,
    IsObject, // DIIMPOR: Untuk memvalidasi objek
    IsArray,  // DIIMPOR: Untuk memvalidasi array
} from 'class-validator';

// Fungsi transformer ini sudah benar, tidak perlu diubah
const jsonTransformer = Transform(({ value }) => {
  try { return JSON.parse(value); } catch (e) { return value; }
});

export class CreateProductDto {
  @ApiProperty({ description: 'Nama produk (JSON string)', example: '{"en": "Product Name"}' })
  @jsonTransformer
  @IsObject({ message: 'Nama produk harus berupa objek JSON yang valid.' }) // DIUBAH: dari IsJSON menjadi IsObject
  name: any;

  @ApiProperty({ description: 'Varian produk (JSON string)', example: '{"en": "Variegated"}' })
  @jsonTransformer
  @IsObject({ message: 'Varian produk harus berupa objek JSON yang valid.' }) // DIUBAH
  variant: any;

  @ApiPropertyOptional({ description: 'Deskripsi produk (JSON string)' })
  @IsOptional()
  @jsonTransformer
  @IsObject({ message: 'Deskripsi produk harus berupa objek JSON yang valid.' }) // DIUBAH
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
  
  @ApiProperty({ description: 'Detail perawatan (JSON string)', example: '[{"name":{"en":"Watering"},"value":{"en":"Once a week"}}]' })
  @jsonTransformer
  @IsArray({ message: 'Detail perawatan harus berupa array JSON yang valid.' }) // DIUBAH: dari IsJSON menjadi IsArray
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

  @ApiProperty({ description: 'Harga produk (JSON string)', example: '[{"currencyId":1,"price":150000}]' })
  @jsonTransformer
  @IsArray({ message: 'Harga produk harus berupa array JSON yang valid.' }) // DIUBAH: dari IsJSON menjadi IsArray
  prices: any;
}
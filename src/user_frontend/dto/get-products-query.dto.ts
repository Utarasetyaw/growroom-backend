import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class GetProductsQueryDto {
  @ApiPropertyOptional({ description: 'Nomor halaman', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ description: 'Jumlah item per halaman', default: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 12;

  @ApiPropertyOptional({ description: 'ID kategori untuk filter' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional({ description: 'ID sub-kategori untuk filter' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  subCategoryId?: number;

  @ApiPropertyOptional({ description: 'Teks pencarian untuk nama produk' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter berdasarkan varian produk' })
  @IsOptional()
  @IsString()
  variant?: string;

  @ApiPropertyOptional({ enum: ['AVAILABLE', 'OUT_OF_STOCK'], description: 'Filter berdasarkan ketersediaan stok' })
  @IsOptional()
  @IsEnum(['AVAILABLE', 'OUT_OF_STOCK'])
  availability?: 'AVAILABLE' | 'OUT_OF_STOCK';

  @ApiPropertyOptional({ description: 'Harga minimum' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({ description: 'Harga maksimum' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({ description: 'Kode mata uang untuk filter harga (e.g., IDR, USD)', example: 'IDR' })
  @IsOptional()
  @IsString()
  currencyCode?: string;
}

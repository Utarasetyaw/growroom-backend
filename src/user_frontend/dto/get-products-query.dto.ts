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

  @ApiPropertyOptional({ description: 'Filter berdasarkan ID Kategori' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional({ description: 'Filter berdasarkan ID Sub-Kategori' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  subCategoryId?: number;

  @ApiPropertyOptional({ description: 'Kata kunci pencarian produk' })
  @IsOptional()
  @IsString()
  search?: string;
  
  @ApiPropertyOptional({ description: 'Filter berdasarkan varian produk' })
  @IsOptional()
  @IsString()
  variant?: string;

  @ApiPropertyOptional({ description: 'Filter berdasarkan ketersediaan stok', enum: ['AVAILABLE', 'OUT_OF_STOCK'] })
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
}
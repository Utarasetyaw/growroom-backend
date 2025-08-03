import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

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
}
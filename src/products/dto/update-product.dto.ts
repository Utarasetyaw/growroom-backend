import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, IsArray, IsObject, IsBoolean, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

// DTO parsial ini bisa ditaruh di file terpisah agar tidak duplikat
class UpdateProductPriceDto {
  @ApiPropertyOptional({ description: 'ID dari mata uang.', example: 1 })
  @IsInt() 
  currencyId: number;

  @ApiPropertyOptional({ description: 'Harga produk.', example: 255000 })
  @IsNumber() 
  price: number;
}

class UpdateProductImageDto {
  @ApiPropertyOptional({ description: 'URL dari gambar produk.', example: '/uploads/products/new_image.jpg' })
  @IsOptional() 
  url?: string;
}

export class UpdateProductDto {
  @ApiPropertyOptional({ description: 'Nama produk baru.', example: { id: "Kemeja Keren" } })
  @IsOptional() @IsObject() name?: Record<string, string>;
  
  @ApiPropertyOptional({ description: 'Varian produk baru.', example: { id: "Merah" } })
  @IsOptional() @IsObject() variant?: Record<string, string>;
  
  @ApiPropertyOptional()
  @IsOptional() @IsInt() subCategoryId?: number;
  
  @ApiPropertyOptional()
  @IsOptional() @IsInt() stock?: number;
  
  @ApiPropertyOptional()
  @IsOptional() @IsNumber() weight?: number;
  
  @ApiPropertyOptional()
  @IsOptional() @IsObject() careDetails?: Record<string, any>;
  
  @ApiPropertyOptional()
  @IsOptional() @IsBoolean() isBestProduct?: boolean;
  
  @ApiPropertyOptional()
  @IsOptional() @IsBoolean() isActive?: boolean;
  
  @ApiPropertyOptional({ type: [UpdateProductImageDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => UpdateProductImageDto)
  images?: UpdateProductImageDto[];
  
  @ApiPropertyOptional({ type: [UpdateProductPriceDto] })
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => UpdateProductPriceDto)
  prices?: UpdateProductPriceDto[];
}
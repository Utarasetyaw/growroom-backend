// src/products/dto/update-product.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsInt, IsArray, IsObject, IsBoolean, ValidateNested, IsNumber, IsString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { CreateProductDto } from './create-product.dto'; // Impor untuk menggunakan nested DTOs
import { PartialType } from '@nestjs/swagger';


// REVISI: Sangat disarankan menggunakan PartialType untuk menghindari duplikasi.
// Namun, jika Anda ingin tetap manual, beginilah caranya:

// Helper function untuk parsing (bisa diekstrak ke file terpisah)
const parseJson = ({ value }) => {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch (e) { return value; }
  }
  return value;
};

// DTO parsial untuk relasi (hanya jika Anda tidak menggunakan PartialType)
class UpdateProductPriceDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() currencyId?: number;
  @ApiPropertyOptional() @IsOptional() @IsNumber() price?: number;
}
class UpdateCareDetailDto {
  @ApiPropertyOptional() @IsOptional() @IsObject() name?: { en: string; id: string; };
  @ApiPropertyOptional() @IsOptional() @IsObject() value?: { en: string; id: string; };
}

export class UpdateProductDto {
  @ApiPropertyOptional({ type: 'string', example: '{"en": "Monstera Updated"}' })
  @Transform(parseJson)
  @IsOptional() @IsObject() name?: Record<string, string>;

  @ApiPropertyOptional({ type: 'string', example: '{"en": "Variegated"}' })
  @Transform(parseJson)
  @IsOptional() @IsObject() variant?: Record<string, string>;
  
  @ApiPropertyOptional({ type: 'string', example: '{"en": "Updated description"}' })
  @Transform(parseJson)
  @IsOptional() @IsObject() description?: Record<string, string>;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional() @IsInt() subCategoryId?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional() @IsInt() stock?: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional() @IsNumber() weight?: number;

  @ApiPropertyOptional({ type: 'string' })
  @Transform(parseJson)
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => UpdateCareDetailDto)
  careDetails?: UpdateCareDetailDto[];

  @ApiPropertyOptional({ type: 'string', example: 'false' })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional() @IsBoolean() isBestProduct?: boolean;

  @ApiPropertyOptional({ type: 'string', example: 'false' })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional() @IsBoolean() isActive?: boolean;

  @ApiPropertyOptional({ type: 'string', example: '[{"currencyId":1, "price":160000}]' })
  @Transform(parseJson)
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => UpdateProductPriceDto)
  prices?: UpdateProductPriceDto[];

  @ApiPropertyOptional({ 
    description: 'Array berisi ID gambar yang ingin dihapus. Kirim sebagai string jika dari form, misal: "1,2,3"',
    type: 'string', 
    example: '1,3' 
  })
  @Transform(({ value }) => typeof value === 'string' ? value.split(',').map(Number) : [value].flat().map(Number))
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  imagesToDelete?: number[];
}
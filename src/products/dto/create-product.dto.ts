import { IsNotEmpty, IsInt, IsOptional, IsBoolean, IsArray, IsObject, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class ProductPriceDto {
  @IsInt() currencyId: number;
  @IsNumber() price: number;
}

class ProductImageDto {
  @IsNotEmpty() url: string;
}

export class CreateProductDto {
  @IsObject() name: Record<string, string>;       // e.g. { "id": "...", "en": "...", ... }
  @IsObject() variant: Record<string, string>;    // e.g. { "id": "...", "en": "...", ... }
  @IsInt() subCategoryId: number;
  @IsInt() stock: number;
  @IsOptional() @IsNumber() weight?: number;
  @IsOptional() @IsObject() careDetails?: Record<string, any>;
  @IsOptional() @IsBoolean() isBestProduct?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProductImageDto)
  images?: ProductImageDto[];
  @IsArray() @ValidateNested({ each: true }) @Type(() => ProductPriceDto)
  prices: ProductPriceDto[];
}

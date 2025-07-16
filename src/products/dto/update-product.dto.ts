import { IsOptional, IsInt, IsArray, IsObject, IsBoolean, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class ProductPriceDto {
  @IsInt() currencyId: number;
  @IsNumber() price: number;
}

class ProductImageDto {
  @IsOptional() url?: string;
}

export class UpdateProductDto {
  @IsOptional() @IsObject() name?: Record<string, string>;
  @IsOptional() @IsObject() variant?: Record<string, string>;
  @IsOptional() @IsInt() subCategoryId?: number;
  @IsOptional() @IsInt() stock?: number;
  @IsOptional() @IsNumber() weight?: number;
  @IsOptional() @IsObject() careDetails?: Record<string, any>;
  @IsOptional() @IsBoolean() isBestProduct?: boolean;
  @IsOptional() @IsBoolean() isActive?: boolean;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProductImageDto)
  images?: ProductImageDto[];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ProductPriceDto)
  prices?: ProductPriceDto[];
}

import {
  IsString,
  IsBoolean,
  IsOptional,
  IsArray,
  ValidateNested,
  IsInt,
  IsNumber,
  IsNotEmpty   // <-- TAMBAHKAN INI!
} from 'class-validator';
import { Type } from 'class-transformer';

class RatePriceDto {
  @IsNotEmpty()
  @IsInt()
  currencyId: number;

  @IsNotEmpty()
  @IsNumber()
  price: number;
}

export class UpdateShippingRateDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RatePriceDto)
  prices?: RatePriceDto[];
}

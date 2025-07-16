import { IsNotEmpty, IsInt, IsString, IsBoolean, IsOptional, ValidateNested, IsArray, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class RatePriceDto {
  @IsNotEmpty()
  @IsInt()
  currencyId: number;

  @IsNotEmpty()
  @IsNumber()
  price: number;
}

export class CreateShippingRateDto {
  @IsNotEmpty()
  @IsString()
  city: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsNotEmpty()
  @IsInt()
  zoneId: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RatePriceDto)
  prices: RatePriceDto[];
}

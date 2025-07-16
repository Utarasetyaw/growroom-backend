import { IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ShippingZonePriceDto {
  @IsNotEmpty()
  currencyId: number;
  @IsNotEmpty()
  price: number;
}

export class UpdateShippingZoneDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShippingZonePriceDto)
  prices?: ShippingZonePriceDto[];
}

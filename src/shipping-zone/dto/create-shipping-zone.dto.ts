import { IsString, IsNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ShippingZonePriceDto {
  @IsNotEmpty()
  currencyId: number;
  @IsNotEmpty()
  price: number;
}

export class CreateShippingZoneDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ShippingZonePriceDto)
  prices: ShippingZonePriceDto[];
}

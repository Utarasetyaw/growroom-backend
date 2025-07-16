import {
  IsString, IsBoolean, IsOptional, IsArray, ValidateNested, IsNotEmpty, IsNumber, IsInt
} from 'class-validator';
import { Type } from 'class-transformer';

class ZonePriceDto {
  @IsNotEmpty()
  @IsInt()
  currencyId: number;

  @IsNotEmpty()
  @IsNumber()
  price: number;
}

export class UpdateShippingZoneDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ZonePriceDto)
  prices?: ZonePriceDto[];
}

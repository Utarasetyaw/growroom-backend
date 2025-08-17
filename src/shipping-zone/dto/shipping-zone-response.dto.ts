import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// DTO parsial untuk data yang di-nest
class CurrencyInPriceDto {
    @ApiProperty() code: string;
}
class PriceDto {
    @ApiProperty() price: number;
    @ApiProperty({ type: () => CurrencyInPriceDto })
    @Type(() => CurrencyInPriceDto)
    currency: CurrencyInPriceDto;
}
class RateInZoneDto {
    @ApiProperty() id: number;
    @ApiProperty() city: string;

    @ApiProperty({ type: () => [PriceDto] })
    @Type(() => PriceDto)
    prices: PriceDto[];
}

// DTO utama
export class ShippingZoneResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;
  
  @ApiProperty()
  isActive: boolean;
  
  @ApiProperty()
  createdAt: Date;
  
  @ApiProperty()
  updatedAt: Date;
  
  @ApiProperty({ type: () => [PriceDto] })
  @Type(() => PriceDto)
  prices: PriceDto[];

  @ApiProperty({ type: () => [RateInZoneDto] })
  @Type(() => RateInZoneDto)
  rates: RateInZoneDto[];
}
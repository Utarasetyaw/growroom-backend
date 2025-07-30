import { ApiProperty } from '@nestjs/swagger';

class CurrencyInZoneDto { @ApiProperty() id: number; @ApiProperty() code: string; }
class PriceInZoneDto { @ApiProperty() id: number; @ApiProperty() price: number; @ApiProperty({ type: CurrencyInZoneDto }) currency: CurrencyInZoneDto; }
class RateInZoneDto { @ApiProperty() id: number; @ApiProperty() city: string; }

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
  
  @ApiProperty({ type: [PriceInZoneDto] })
  prices: PriceInZoneDto[];

  @ApiProperty({ type: [RateInZoneDto] })
  rates: RateInZoneDto[];
}
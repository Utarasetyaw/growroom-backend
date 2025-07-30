import { ApiProperty } from '@nestjs/swagger';

class ZoneInRateDto { @ApiProperty() id: number; @ApiProperty() name: string; }
class CurrencyInRateDto { @ApiProperty() id: number; @ApiProperty() code: string; }
class PriceInRateDto { @ApiProperty() id: number; @ApiProperty() price: number; @ApiProperty({ type: CurrencyInRateDto }) currency: CurrencyInRateDto; }

export class ShippingRateResponseDto {
  @ApiProperty()
  id: number;
  
  @ApiProperty()
  city: string;
  
  @ApiProperty()
  isActive: boolean;
  
  @ApiProperty()
  zoneId: number;
  
  @ApiProperty()
  createdAt: Date;
  
  @ApiProperty()
  updatedAt: Date;
  
  @ApiProperty({ type: ZoneInRateDto })
  zone: ZoneInRateDto;
  
  @ApiProperty({ type: [PriceInRateDto] })
  prices: PriceInRateDto[];
}
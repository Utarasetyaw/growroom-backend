import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsInt, IsString, IsBoolean, IsOptional, ValidateNested, IsArray, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class RatePriceDto {
  @ApiProperty({ description: 'ID mata uang.', example: 1 })
  @IsNotEmpty()
  @IsInt()
  currencyId: number;

  @ApiProperty({ description: 'Harga ongkos kirim.', example: 9000 })
  @IsNotEmpty()
  @IsNumber()
  price: number;
}

export class CreateShippingRateDto {
  @ApiProperty({ description: 'Nama kota atau wilayah tujuan.', example: 'Jakarta Pusat' })
  @IsNotEmpty()
  @IsString()
  city: string;

  @ApiPropertyOptional({ description: 'Status aktif ongkos kirim.', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiProperty({ description: 'ID dari zona pengiriman terkait.', example: 1 })
  @IsNotEmpty()
  @IsInt()
  zoneId: number;

  @ApiProperty({ type: [RatePriceDto], description: 'List harga ongkos kirim dalam berbagai mata uang.' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RatePriceDto)
  prices: RatePriceDto[];
}
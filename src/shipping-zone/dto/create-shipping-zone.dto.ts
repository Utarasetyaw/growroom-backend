import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsArray, ValidateNested, IsNotEmpty, IsNumber, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class ZonePriceDto {
  @ApiProperty({ description: 'ID mata uang.', example: 1 })
  @IsNotEmpty()
  @IsInt()
  currencyId: number;

  @ApiProperty({ description: 'Harga dasar untuk zona ini.', example: 15000 })
  @IsNotEmpty()
  @IsNumber()
  price: number;
}

export class CreateShippingZoneDto {
  @ApiProperty({ description: 'Nama zona pengiriman.', example: 'Jabodetabek' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Status aktif zona.', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @ApiPropertyOptional({ type: [ZonePriceDto], description: 'Harga dasar untuk zona ini dalam berbagai mata uang.' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ZonePriceDto)
  prices?: ZonePriceDto[];
}
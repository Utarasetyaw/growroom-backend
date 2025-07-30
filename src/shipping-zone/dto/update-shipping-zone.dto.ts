import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsArray, ValidateNested, IsNotEmpty, IsNumber, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class UpdateZonePriceDto {
  @ApiProperty({ description: 'ID mata uang.', example: 1 })
  @IsNotEmpty()
  @IsInt()
  currencyId: number;

  @ApiProperty({ description: 'Harga dasar baru.', example: 16000 })
  @IsNotEmpty()
  @IsNumber()
  price: number;
}

export class UpdateShippingZoneDto {
  @ApiPropertyOptional({ description: 'Nama baru untuk zona.', example: 'Jabodetabek & Bandung' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Status aktif baru.' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [UpdateZonePriceDto], description: 'List harga baru (akan menimpa list lama).' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateZonePriceDto)
  prices?: UpdateZonePriceDto[];
}
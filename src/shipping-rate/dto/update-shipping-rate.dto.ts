import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsArray, ValidateNested, IsInt, IsNumber, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

class UpdateRatePriceDto {
  @ApiProperty({ description: 'ID mata uang.', example: 1 })
  @IsNotEmpty()
  @IsInt()
  currencyId: number;

  @ApiProperty({ description: 'Harga ongkos kirim.', example: 10000 })
  @IsNotEmpty()
  @IsNumber()
  price: number;
}

export class UpdateShippingRateDto {
  @ApiPropertyOptional({ description: 'Nama kota atau wilayah baru.', example: 'Jakarta Barat' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ description: 'Status aktif baru.' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ type: [UpdateRatePriceDto], description: 'List harga baru (akan menimpa list lama).' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateRatePriceDto)
  prices?: UpdateRatePriceDto[];
}
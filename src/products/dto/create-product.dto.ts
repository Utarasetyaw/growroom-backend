import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
    IsString,
    IsInt,
    IsBoolean,
    IsOptional,
    Min,
    IsNumber,
    ValidateNested,
    IsArray
} from 'class-validator';

// DTO untuk objek multibahasa
class MultiLanguageDto {
    @IsOptional()
    @IsString()
    id?: string;

    @IsOptional()
    @IsString()
    en?: string;
}

// DTO untuk setiap item harga
class PriceDto {
    @ApiProperty()
    @IsInt()
    currencyId: number;

    @ApiProperty()
    @IsNumber()
    price: number;
}

// DTO untuk setiap item detail perawatan
class CareDetailDto {
    @ApiProperty()
    @ValidateNested()
    @Type(() => MultiLanguageDto)
    name: MultiLanguageDto;

    @ApiProperty()
    @ValidateNested()
    @Type(() => MultiLanguageDto)
    value: MultiLanguageDto;
}


export class CreateProductDto {
  @ApiProperty({ description: 'Nama produk (multibahasa)', type: MultiLanguageDto, example: '{"id": "Monstera Deliciosa", "en": "Swiss Cheese Plant"}' })
  @ValidateNested()
  @Type(() => MultiLanguageDto)
  @Transform(({ value }) => typeof value === 'string' ? JSON.parse(value) : value)
  name: MultiLanguageDto;

  @ApiProperty({ description: 'Varian produk (multibahasa)', type: MultiLanguageDto, example: '{"id": "Variegata", "en": "Variegated"}' })
  @ValidateNested()
  @Type(() => MultiLanguageDto)
  @Transform(({ value }) => typeof value === 'string' ? JSON.parse(value) : value)
  variant: MultiLanguageDto;

  @ApiPropertyOptional({ description: 'Deskripsi produk (multibahasa)', type: MultiLanguageDto, example: '{"id": "Tanaman hias populer...", "en": "A popular houseplant..."}' })
  @IsOptional()
  @ValidateNested()
  @Type(() => MultiLanguageDto)
  @Transform(({ value }) => typeof value === 'string' ? JSON.parse(value) : value)
  description?: MultiLanguageDto;

  @ApiProperty({ description: 'Jumlah stok produk', example: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({ description: 'Berat produk dalam gram', example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weight?: number;
  
  @ApiProperty({ description: 'Detail perawatan', type: [CareDetailDto], example: '[{"name":{"id":"Penyiraman","en":"Watering"},"value":{"id":"Seminggu sekali","en":"Once a week"}}]' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CareDetailDto)
  @Transform(({ value }) => typeof value === 'string' ? JSON.parse(value) : value)
  careDetails: CareDetailDto[];

  @ApiPropertyOptional({ description: 'Produk unggulan?', default: false, type: 'boolean' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true) // Konversi 'true' string ke boolean
  @IsBoolean()
  isBestProduct?: boolean;

  @ApiPropertyOptional({ description: 'Produk aktif?', default: true, type: 'boolean' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true) // Konversi 'true' string ke boolean
  @IsBoolean()
  isActive?: boolean;
  
  @ApiProperty({ description: 'ID sub-kategori', example: 1 })
  @Type(() => Number)
  @IsInt()
  subCategoryId: number;

  @ApiProperty({ description: 'Harga produk', type: [PriceDto], example: '[{"currencyId":1,"price":150000},{"currencyId":2,"price":10}]' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PriceDto)
  @Transform(({ value }) => typeof value === 'string' ? JSON.parse(value) : value)
  prices: PriceDto[];
}
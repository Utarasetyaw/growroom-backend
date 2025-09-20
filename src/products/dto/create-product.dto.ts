import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
    IsString,
    IsInt,
    IsBoolean,
    IsOptional,
    Min,
    IsNumber,
    IsObject,
    IsArray,
    ValidateIf,
} from 'class-validator';

// Transformer untuk JSON
const jsonTransformer = Transform(({ value }) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      return value;
    }
  }
  return value;
});

// Transformer yang lebih kuat untuk menangani nilai boolean dari form
const booleanTransformer = Transform(({ value }) => {
  if (value === 'true' || value === true) {
    return true;
  }
  if (value === 'false' || value === false) {
    return false;
  }
  return value;
});

export class CreateProductDto {
  @ApiProperty({ description: 'Nama produk (JSON string)', example: '{"en": "Product Name"}' })
  @jsonTransformer
  @IsObject({ message: 'Nama produk harus berupa objek JSON yang valid.' })
  name: any;

  @ApiProperty({ description: 'Varian produk (JSON string)', example: '{"en": "Variegated"}' })
  @jsonTransformer
  @IsObject({ message: 'Varian produk harus berupa objek JSON yang valid.' })
  variant: any;

  @ApiPropertyOptional({ description: 'Deskripsi produk (JSON string)' })
  @IsOptional()
  @jsonTransformer
  @ValidateIf(o => o.description !== null && o.description !== undefined && o.description !== '')
  @IsObject({ message: 'Deskripsi produk harus berupa objek JSON yang valid.' })
  description?: any;

  @ApiProperty({ description: 'Jumlah stok produk', example: 100 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({ description: 'Berat produk dalam gram', example: 500 })
  @IsOptional()
  @Transform(({ value }) => (value ? parseFloat(value) : null))
  @IsNumber()
  weight?: number;
  
  @ApiProperty({ description: 'Detail perawatan (JSON string)', example: '[{"name":{"en":"Watering"},"value":{"en":"Once a week"}}]' })
  @jsonTransformer
  @IsArray({ message: 'Detail perawatan harus berupa array JSON yang valid.' })
  careDetails: any;

  @ApiPropertyOptional({ description: 'Produk unggulan?', default: false, type: 'boolean' })
  @IsOptional()
  @booleanTransformer
  @IsBoolean()
  isBestProduct?: boolean;

  @ApiPropertyOptional({ description: 'Produk aktif?', default: true, type: 'boolean' })
  @IsOptional()
  @booleanTransformer
  @IsBoolean()
  isActive?: boolean;
  
  @ApiProperty({ description: 'ID sub-kategori', example: 1 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  subCategoryId: number;

  @ApiProperty({ description: 'Harga produk (JSON string)', example: '[{"currencyId":1,"price":150000}]' })
  @jsonTransformer
  @IsArray({ message: 'Harga produk harus berupa array JSON yang valid.' })
  prices: any;
}
// src/products/dto/create-product.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsInt, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type, Transform } from 'class-transformer';

// REVISI: Helper function untuk parsing JSON yang datang sebagai string
const parseJson = ({ value }) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      // Biarkan validator menangani error jika parsing gagal
      return value;
    }
  }
  return value; // Kembalikan nilai asli jika sudah objek/bukan string
};

// DTOs untuk struktur data yang kompleks (nested)
class ProductPriceDto {
  @ApiProperty()
  @IsInt()
  currencyId: number;

  @ApiProperty()
  @IsNumber()
  price: number;
}

class CareDetailNameDto {
    @ApiProperty() @IsString() en: string;
    @ApiProperty() @IsString() id: string;
}

class CareDetailValueDto {
    @ApiProperty() @IsString() en: string;
    @ApiProperty() @IsString() id: string;
}

class CareDetailDto {
    @ApiProperty({ type: CareDetailNameDto })
    @IsObject()
    @ValidateNested()
    @Type(() => CareDetailNameDto)
    name: CareDetailNameDto;

    @ApiProperty({ type: CareDetailValueDto })
    @IsObject()
    @ValidateNested()
    @Type(() => CareDetailValueDto)
    value: CareDetailValueDto;
}


export class CreateProductDto {
  @ApiProperty({ type: 'string', example: '{"en": "Monstera", "id": "Monstera"}' })
  @Transform(parseJson) // REVISI: Auto-parse JSON dari string
  @IsObject()
  name: Record<string, string>;

  @ApiProperty({ type: 'string', example: '{"en": "Deliciosa", "id": "Deliciosa"}' })
  @Transform(parseJson) // REVISI: Auto-parse JSON dari string
  @IsObject()
  variant: Record<string, string>;
  
  @ApiPropertyOptional({ type: 'string', description: "Deskripsi produk.", example: '{"en": "A beautiful plant", "id": "Tanaman yang indah"}' })
  @Transform(parseJson) // REVISI: Auto-parse JSON dari string
  @IsOptional()
  @IsObject()
  description?: Record<string, string>;

  @ApiProperty()
  @Type(() => Number) // REVISI: Ubah string dari form-data menjadi number
  @IsInt()
  subCategoryId: number;

  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  stock: number;

  @ApiPropertyOptional()
  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ type: 'string', example: '[{"name":{"en":"Pot Size","id":"Ukuran Pot"},"value":{"en":"15 cm","id":"15 cm"}}]' })
  @Transform(parseJson) // REVISI: Auto-parse JSON dari string
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CareDetailDto)
  careDetails?: CareDetailDto[];

  @ApiPropertyOptional({ type: 'string', example: 'true' })
  @Transform(({ value }) => value === 'true' || value === true) // REVISI: Handle boolean dari string
  @IsOptional()
  @IsBoolean()
  isBestProduct?: boolean;

  @ApiPropertyOptional({ type: 'string', example: 'true' })
  @Transform(({ value }) => value === 'true' || value === true) // REVISI: Handle boolean dari string
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ type: 'string', description: 'Array JSON dari harga', example: '[{"currencyId":1, "price":150000}]' })
  @Transform(parseJson) // REVISI: Auto-parse JSON dari string
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductPriceDto)
  prices: ProductPriceDto[];

  // REVISI: Properti `images` dihapus dari DTO. Ini akan ditangani oleh `@UploadedFiles` di controller.
}
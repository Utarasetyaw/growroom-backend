// File: src/products/dto/create-product.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsString, IsInt, IsBoolean, IsOptional, Min, IsNotEmpty, IsJSON, IsNumber } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    description: 'Nama produk dalam format JSON (multibahasa)',
    example: '{"id": "Monstera Deliciosa", "en": "Swiss Cheese Plant"}',
  })
  @IsJSON()
  name: string;

  @ApiProperty({
    description: 'Varian produk dalam format JSON (multibahasa)',
    example: '{"id": "Variegata", "en": "Variegated"}',
  })
  @IsJSON()
  variant: string;

  @ApiPropertyOptional({
    description: 'Deskripsi produk dalam format JSON (multibahasa)',
    example: '{"id": "Tanaman hias populer...", "en": "A popular houseplant..."}',
  })
  @IsOptional()
  @IsJSON()
  description?: string;

  @ApiProperty({ description: 'Jumlah stok produk', example: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock: number;

  @ApiPropertyOptional({ description: 'Berat produk dalam gram (opsional)', example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weight?: number;
  
  @ApiProperty({
    description: 'Detail perawatan dalam format JSON string dari sebuah array',
    example: '[{"name":{"id":"Penyiraman","en":"Watering"},"value":{"id":"Seminggu sekali","en":"Once a week"}}]'
  })
  @IsJSON()
  careDetails: string;

  @ApiPropertyOptional({ description: 'Apakah ini produk unggulan?', default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isBestProduct?: boolean;

  @ApiPropertyOptional({ description: 'Apakah produk ini aktif dan ditampilkan?', default: true })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  isActive?: boolean;
  
  @ApiProperty({ description: 'ID dari sub-kategori produk', example: 1 })
  @Type(() => Number)
  @IsInt()
  subCategoryId: number;

  @ApiProperty({
    description: 'Harga produk dalam berbagai mata uang (format JSON string dari sebuah array)',
    example: '[{"currencyId":1,"price":150000},{"currencyId":2,"price":10}]'
  })
  @IsJSON()
  prices: string;
}
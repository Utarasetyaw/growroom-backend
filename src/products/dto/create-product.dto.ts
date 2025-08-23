import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
    IsString,
    IsInt,
    IsBoolean,
    IsOptional,
    Min,
    IsNumber,
    IsJSON, // 1. Import IsJSON
} from 'class-validator';

// Catatan: DTO di bawah ini (MultiLanguageDto, PriceDto, CareDetailDto)
// tidak lagi digunakan secara langsung untuk validasi di sini,
// tetapi struktur ini merepresentasikan bentuk JSON yang diharapkan di dalam string.

class MultiLanguageDto {
    id?: string;
    en?: string;
}

class PriceDto {
    currencyId: number;
    price: number;
}

class CareDetailDto {
    name: MultiLanguageDto;
    value: MultiLanguageDto;
}


export class CreateProductDto {
  /**
   * Nama produk dalam format JSON string.
   * @example '{"id": "Monstera Deliciosa", "en": "Swiss Cheese Plant"}'
   */
  @ApiProperty({ 
    description: 'Nama produk (JSON string)', 
    example: '{"id": "Monstera Deliciosa", "en": "Swiss Cheese Plant"}' 
  })
  @IsString()
  @IsJSON({ message: 'Nama produk harus berupa JSON string yang valid.' })
  name: string; // 2. Ubah tipe menjadi string

  /**
   * Varian produk dalam format JSON string.
   * @example '{"id": "Variegata", "en": "Variegated"}'
   */
  @ApiProperty({ 
    description: 'Varian produk (JSON string)', 
    example: '{"id": "Variegata", "en": "Variegated"}' 
  })
  @IsString()
  @IsJSON({ message: 'Varian produk harus berupa JSON string yang valid.' })
  variant: string; // 3. Ubah tipe menjadi string

  /**
   * Deskripsi produk dalam format JSON string (opsional).
   * @example '{"id": "Tanaman hias populer...", "en": "A popular houseplant..."}'
   */
  @ApiPropertyOptional({ 
    description: 'Deskripsi produk (JSON string)', 
    example: '{"id": "Tanaman hias populer...", "en": "A popular houseplant..."}' 
  })
  @IsOptional()
  @IsString()
  @IsJSON({ message: 'Deskripsi produk harus berupa JSON string yang valid.' })
  description?: string; // 4. Ubah tipe menjadi string

  /**
   * Jumlah stok produk.
   */
  @ApiProperty({ description: 'Jumlah stok produk', example: 100 })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stock: number;

  /**
   * Berat produk dalam gram (opsional).
   */
  @ApiPropertyOptional({ description: 'Berat produk dalam gram', example: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  weight?: number;
  
  /**
   * Detail perawatan dalam format JSON string (array of objects).
   * @example '[{"name":{"id":"Penyiraman","en":"Watering"},"value":{"id":"Seminggu sekali","en":"Once a week"}}]'
   */
  @ApiProperty({ 
    description: 'Detail perawatan (JSON string)', 
    example: '[{"name":{"id":"Penyiraman","en":"Watering"},"value":{"id":"Seminggu sekali","en":"Once a week"}}]' 
  })
  @IsString()
  @IsJSON({ message: 'Detail perawatan harus berupa JSON string yang valid.' })
  careDetails: string; // 5. Ubah tipe menjadi string

  /**
   * Status produk unggulan (opsional).
   */
  @ApiPropertyOptional({ description: 'Produk unggulan?', default: false, type: 'boolean' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isBestProduct?: boolean;

  /**
   * Status produk aktif (opsional).
   */
  @ApiPropertyOptional({ description: 'Produk aktif?', default: true, type: 'boolean' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;
  
  /**
   * ID dari sub-kategori.
   */
  @ApiProperty({ description: 'ID sub-kategori', example: 1 })
  @Type(() => Number)
  @IsInt()
  subCategoryId: number;

  /**
   * Harga produk dalam format JSON string (array of objects).
   * @example '[{"currencyId":1,"price":150000},{"currencyId":2,"price":10}]'
   */
  @ApiProperty({ 
    description: 'Harga produk (JSON string)', 
    example: '[{"currencyId":1,"price":150000},{"currencyId":2,"price":10}]' 
  })
  @IsString()
  @IsJSON({ message: 'Harga produk harus berupa JSON string yang valid.' })
  prices: string; // 6. Ubah tipe menjadi string
}

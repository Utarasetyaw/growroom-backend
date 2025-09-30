// update-product.dto.ts (FULL REVISED CODE)

import { ApiPropertyOptional } from '@nestjs/swagger';
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

// Transformer untuk JSON yang akan digunakan kembali
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

export class UpdateProductDto {
  @ApiPropertyOptional({ description: 'Nama produk (JSON string)' })
  @IsOptional()
  @jsonTransformer
  @IsObject({ message: 'Nama produk harus berupa objek JSON yang valid.' })
  name?: any;

  @ApiPropertyOptional({ description: 'Varian produk (JSON string)' })
  @IsOptional()
  @jsonTransformer
  @IsObject({ message: 'Varian produk harus berupa objek JSON yang valid.' })
  variant?: any;

  @ApiPropertyOptional({ description: 'Deskripsi produk (JSON string)' })
  @IsOptional()
  @jsonTransformer
  @ValidateIf((o) => o.description !== null && o.description !== undefined)
  @IsObject({ message: 'Deskripsi produk harus berupa objek JSON yang valid.' })
  description?: any;

  @ApiPropertyOptional({ description: 'Jumlah stok produk' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @Min(0)
  stock?: number;

  @ApiPropertyOptional({ description: 'Berat produk dalam gram' })
  @IsOptional()
  @Transform(({ value }) => (value ? parseFloat(value) : null))
  @IsNumber()
  weight?: number;

  @ApiPropertyOptional({ description: 'Detail perawatan (JSON string)' })
  @IsOptional()
  @jsonTransformer
  @IsArray({ message: 'Detail perawatan harus berupa array JSON yang valid.' })
  careDetails?: any;

  @ApiPropertyOptional({ description: 'Produk unggulan?', type: 'boolean' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isBestProduct?: boolean;

  @ApiPropertyOptional({ description: 'Produk aktif?', type: 'boolean' })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'ID sub-kategori' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  subCategoryId?: number;

  @ApiPropertyOptional({ description: 'Harga produk (JSON string)' })
  @IsOptional()
  @jsonTransformer
  @IsArray({ message: 'Harga produk harus berupa array JSON yang valid.' })
  prices?: any; // ========================= PERBAIKAN UTAMA DI SINI =========================

  @ApiPropertyOptional({
    description:
      'String berisi ID gambar yang ingin dihapus (dipisahkan koma, contoh: "1,2,3").',
    type: 'string',
  })
  @IsOptional()
  @Transform(({ value }) => {
    // Jika tidak ada value, kembalikan array kosong agar tidak error
    if (!value) {
      return [];
    } // Ubah value (baik itu angka atau string) menjadi string
    const stringValue = String(value); // Sekarang split, map, dan filter seperti biasa. Ini akan berfungsi
    // untuk "326" maupun "326,327"

    return stringValue
      .split(',')
      .map((item) => parseInt(item.trim(), 10))
      .filter((item) => !isNaN(item) && item > 0);
  })
  @IsArray()
  @IsInt({ each: true })
  imagesToDelete?: number[];
}

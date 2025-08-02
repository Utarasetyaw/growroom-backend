import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

// Helper function untuk mengubah string JSON menjadi objek JavaScript
const parseJson = ({ value }: { value: any }) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (e) {
      // Jika parsing gagal, kembalikan string asli agar validator lain bisa menanganinya
      return value;
    }
  }
  return value; // Kembalikan nilai asli jika sudah objek
};

// --- DTO UTAMA ---
export class CreateProductDto {
  @ApiProperty({ type: 'string', description: 'JSON string untuk nama produk multi-bahasa', example: '{"id":"Bunga","en":"Flower"}' })
  @Transform(parseJson)
  @IsObject()
  name: Record<string, string>;

  @ApiProperty({ type: 'string', description: 'JSON string untuk varian produk multi-bahasa', example: '{"id":"Merah","en":"Red"}' })
  @Transform(parseJson)
  @IsObject()
  variant: Record<string, string>;

  @ApiPropertyOptional({ type: 'string', description: 'JSON string untuk deskripsi produk multi-bahasa' })
  @Transform(parseJson)
  @IsOptional()
  @IsObject()
  description?: Record<string, string>;

  @ApiProperty()
  @Type(() => Number)
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

  @ApiPropertyOptional({ type: 'string' })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  @IsBoolean()
  isBestProduct?: boolean;

  @ApiPropertyOptional({ type: 'string' })
  @Transform(({ value }) => value === 'true' || value === true)
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // REVISI: Terima 'prices' sebagai string JSON. Validasi nested dihapus.
  @ApiPropertyOptional({
    type: 'string',
    description: 'JSON string dari array harga. Contoh: \'[{"price":150000,"currencyId":1}]\'',
  })
  @IsOptional()
  @IsString()
  prices?: string;

  // REVISI: Terima 'careDetails' sebagai string JSON. Validasi nested dihapus.
  @ApiPropertyOptional({
    type: 'string',
    description: 'JSON string dari array care details. Contoh: \'[{"name":{"id":"Ukuran"},"value":{"id":"Besar"}}]\'',
  })
  @IsOptional()
  @IsString()
  careDetails?: string;
}
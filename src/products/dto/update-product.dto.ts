import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { CreateProductDto } from './create-product.dto';

/**
 * DTO untuk mengupdate produk.
 * Mewarisi semua properti dari CreateProductDto dan menjadikannya opsional.
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional({
    description: 'Array berisi ID gambar yang ingin dihapus. Dapat dikirim sebagai string (e.g., "1,2,3") atau array angka.',
    type: 'string', // Tipe di swagger adalah string untuk mengakomodasi input form-data
    example: '1,3',
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Transform(({ value }) => {
    // Jika tidak ada value, jangan proses
    if (value === null || value === undefined || value === '') return undefined;
    
    // Jika value adalah string (misal: "1,2,3"), ubah menjadi array angka
    if (typeof value === 'string') {
      return value.split(',')
        .map(item => parseInt(item.trim(), 10))
        .filter(item => !isNaN(item)); // Filter hasil yang bukan angka
    }
    
    // Jika sudah dalam bentuk array, pastikan semua elemen adalah angka
    if (Array.isArray(value)) {
      return value.map(Number).filter(item => !isNaN(item));
    }
    
    // Handle jika hanya satu angka yang dikirim sebagai string
    const num = Number(value);
    return isNaN(num) ? undefined : [num];
  })
  imagesToDelete?: number[];
}
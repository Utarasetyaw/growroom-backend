import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { CreateProductDto } from './create-product.dto';

/**
 * DTO untuk mengupdate produk.
 * Mewarisi semua properti dari CreateProductDto (yang sekarang mengharapkan JSON string)
 * dan menjadikannya opsional.
 */
export class UpdateProductDto extends PartialType(CreateProductDto) {
  /**
   * Array berisi ID gambar yang ingin dihapus.
   * Dapat dikirim sebagai string yang dipisahkan koma (e.g., "1,2,3") atau array angka.
   * Transformator ini akan menangani konversi dari string ke array angka.
   */
  @ApiPropertyOptional({
    description: 'Array atau string berisi ID gambar yang ingin dihapus (dipisahkan koma).',
    type: 'string', // Tipe di swagger adalah string untuk mengakomodasi input form-data
    example: '1,3',
  })
  @IsOptional()
  @Transform(({ value }) => {
    // Jika tidak ada value, kembalikan undefined agar tidak diproses lebih lanjut.
    if (value === null || value === undefined || value === '') return undefined;
    
    // Jika value adalah string (misal: "1,2,3"), ubah menjadi array angka.
    if (typeof value === 'string') {
      return value.split(',')
        .map(item => parseInt(item.trim(), 10))
        .filter(item => !isNaN(item)); // Filter hasil yang bukan angka (misal: dari koma ganda ",,")
    }
    
    // Jika sudah dalam bentuk array, pastikan semua elemen adalah angka.
    if (Array.isArray(value)) {
      return value.map(Number).filter(item => !isNaN(item));
    }
    
    // Handle jika hanya satu angka yang dikirim sebagai string (kasus jarang terjadi).
    const num = Number(value);
    return isNaN(num) ? undefined : [num];
  })
  @IsArray()
  @IsInt({ each: true, message: 'Setiap item di imagesToDelete harus berupa angka (ID gambar).' })
  imagesToDelete?: number[];
}

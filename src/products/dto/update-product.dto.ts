import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  // Semua properti dari CreateProductDto (seperti name, stock, prices, careDetails)
  // otomatis diwarisi dari sini dan statusnya menjadi opsional.
  // Kita hanya perlu menambahkan properti yang spesifik untuk proses update.

  @ApiPropertyOptional({
    description: 'Array berisi ID gambar yang ingin dihapus. Kirim sebagai string jika dari form, misal: "1,2,3"',
    type: 'string', 
    example: '1,3'
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Transform(({ value }) => {
    if (!value) return undefined;
    
    if (typeof value === 'string') {
      return value.split(',')
        .map(item => parseInt(item.trim(), 10))
        .filter(item => !isNaN(item));
    }
    
    if (Array.isArray(value)) {
      return value.map(Number).filter(item => !isNaN(item));
    }
    
    const num = Number(value);
    return isNaN(num) ? undefined : [num];
  })
  imagesToDelete?: number[];
}
import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsArray, IsInt, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  @ApiPropertyOptional({
    description: 'String berisi ID gambar yang ingin dihapus (dipisahkan koma, contoh: "1,2,3").',
    type: 'string',
    example: '1,3',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (!value || typeof value !== 'string') return undefined;
    return value.split(',').map(item => parseInt(item.trim(), 10)).filter(item => !isNaN(item));
  })
  @IsArray()
  @IsInt({ each: true })
  imagesToDelete?: number[];
}
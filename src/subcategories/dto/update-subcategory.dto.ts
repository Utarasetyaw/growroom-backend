import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsObject, IsInt, IsBooleanString } from 'class-validator';

export class UpdateSubcategoryDto {
  @ApiPropertyOptional({
    description: 'Nama baru untuk sub-kategori.',
    example: { id: 'Kaos' },
  })
  @IsOptional()
  @IsObject()
  name?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'ID baru untuk kategori induk.',
    example: 2,
  })
  @IsOptional()
  @IsInt()
  categoryId?: number;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Ganti gambar sub-kategori dengan mengunggah file baru.',
  })
  @IsOptional()
  image?: any;

  @ApiPropertyOptional({
    description: 'Set "true" untuk menghapus gambar yang ada tanpa menggantinya.',
    example: 'true',
  })
  @IsOptional()
  @IsBooleanString()
  deleteImage?: string;
}
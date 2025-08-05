import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsObject, IsBooleanString } from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    description: 'Nama kategori dalam berbagai bahasa yang ingin diperbarui.',
    example: { id: 'Busana Pria' },
  })
  @IsOptional()
  @IsObject()
  name?: Record<string, string>;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'Ganti gambar kategori dengan mengunggah file baru.',
  })
  @IsOptional()
  image?: any;

  @ApiPropertyOptional({
    description:
      'Set "true" untuk menghapus gambar yang ada tanpa menggantinya.',
    example: 'true',
  })
  @IsOptional()
  @IsBooleanString()
  deleteImage?: string;
}
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBooleanString } from 'class-validator';

export class UpdateCategoryDto {
  @ApiPropertyOptional({
    description: "Nama kategori dalam format JSON string. Cth: '{\"id\":\"Busana Pria\"}'",
    example: '{"id":"Busana Pria"}'
  })
  @IsOptional()
  @IsString() // ✅ PERUBAHAN: Diubah dari IsObject menjadi IsString
  name?: Record<string, string> | string;

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
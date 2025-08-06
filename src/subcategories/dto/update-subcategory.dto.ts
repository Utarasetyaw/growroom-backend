import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumberString, IsBooleanString } from 'class-validator';

export class UpdateSubcategoryDto {
  @ApiPropertyOptional({
    description: "Nama baru untuk sub-kategori dalam format JSON string. Cth: '{\"id\":\"Kaos\"}'",
    example: '{"id":"Kaos"}',
    type: 'string', // Menegaskan tipe di Swagger
  })
  @IsOptional()
  @IsString()
  name?: Record<string, string> | string;

  @ApiPropertyOptional({
    description: 'ID baru untuk kategori induk.',
    example: '2',
    type: 'string', // Menegaskan tipe di Swagger
  })
  @IsOptional()
  @IsNumberString()
  categoryId?: number | string;

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
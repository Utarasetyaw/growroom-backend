import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    description: "Nama kategori dalam format JSON string. Cth: '{\"id\":\"Pakaian Pria\",\"en\":\"Men's Wear\"}'",
    example: '{"id":"Pakaian Pria","en":"Men\'s Wear"}',
  })
  @IsNotEmpty()
  @IsString() // ✅ PERUBAHAN: Diubah dari IsObject menjadi IsString
  name: Record<string, string> | string; // Tipe diubah untuk fleksibilitas

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'File gambar opsional untuk kategori.',
  })
  @IsOptional()
  image?: any;
}
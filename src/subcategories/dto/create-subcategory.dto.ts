import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsNumberString } from 'class-validator';

export class CreateSubcategoryDto {
  @ApiProperty({
    description: "Nama sub-kategori dalam format JSON string. Cth: '{\"id\":\"Kemeja\",\"en\":\"Shirt\"}'",
    example: '{"id":"Kemeja","en":"Shirt"}',
  })
  @IsNotEmpty()
  @IsString() // ✅ PERUBAHAN: Dari IsObject menjadi IsString
  name: Record<string, string> | string;

  @ApiProperty({
    description: 'ID dari kategori induk tempat sub-kategori ini bernaung.',
    example: '1', // Dikirim sebagai string
  })
  @IsNotEmpty()
  @IsNumberString() // ✅ PERUBAHAN: Dari IsInt menjadi IsNumberString
  categoryId: number | string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'File gambar opsional untuk sub-kategori.',
  })
  @IsOptional()
  image?: any;
}
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class CreateCategoryDto {
  @ApiProperty({
    description: "Nama kategori dalam format JSON string. Cth: '{\"id\":\"Pakaian Pria\",\"en\":\"Men's Wear\"}'",
    example: '{"id":"Pakaian Pria","en":"Men\'s Wear"}',
    type: 'string', // Menegaskan tipe di Swagger
  })
  @IsNotEmpty()
  @IsString()
  name: Record<string, string> | string;

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
    description: 'File gambar opsional untuk kategori.',
  })
  @IsOptional()
  image?: any;
}
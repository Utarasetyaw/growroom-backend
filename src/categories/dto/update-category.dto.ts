import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsObject } from 'class-validator';

export class UpdateCategoryDto {
  @ApiProperty({
    description: 'Nama kategori dalam berbagai bahasa yang ingin diperbarui.',
    example: { "id": "Busana Pria" },
    required: false,
  })
  @IsOptional()
  @IsObject()
  name?: Record<string, string>;
}
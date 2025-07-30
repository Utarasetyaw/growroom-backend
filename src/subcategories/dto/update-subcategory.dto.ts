import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsObject, IsInt } from 'class-validator';

export class UpdateSubcategoryDto {
  @ApiPropertyOptional({
    description: 'Nama baru untuk sub-kategori.',
    example: { "id": "Kaos" },
  })
  @IsOptional()
  @IsObject()
  name?: Record<string, string>;

  @ApiPropertyOptional({ description: 'ID baru untuk kategori induk.', example: 2 })
  @IsOptional()
  @IsInt()
  categoryId?: number;
}
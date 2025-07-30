import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateLanguageDto {
  @ApiProperty({
    description: 'Set bahasa menjadi aktif atau tidak.',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Set bahasa ini sebagai default (akan menonaktifkan default lainnya).',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
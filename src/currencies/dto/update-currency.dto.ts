import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateCurrencyDto {
  @ApiProperty({
    description: 'Set mata uang menjadi aktif atau tidak.',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    description: 'Set mata uang ini sebagai default (akan menonaktifkan default lainnya).',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
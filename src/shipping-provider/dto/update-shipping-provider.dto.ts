import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class UpdateShippingProviderDto {
  @ApiPropertyOptional({ description: 'Nama baru penyedia jasa pengiriman.', example: 'JNE Reguler' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ description: 'Kode unik baru.', example: 'jne_reg' })
  @IsOptional()
  @IsString()
  code?: string;

  @ApiPropertyOptional({ description: 'Status aktif baru.', example: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Kredensial atau konfigurasi API baru.',
    example: { apiKey: 'new_api_key' },
  })
  @IsOptional()
  @IsObject()
  credentials?: object;
}
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class CreateShippingProviderDto {
  @ApiProperty({ description: 'Nama penyedia jasa pengiriman.', example: 'JNE Express' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Kode unik untuk penyedia jasa pengiriman.', example: 'jne' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({ description: 'Status aktif.', default: true, example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @ApiPropertyOptional({
    description: 'Kredensial atau konfigurasi API (jika ada).',
    example: { apiKey: 'your_api_key' },
  })
  @IsOptional()
  @IsObject()
  credentials?: object;
}
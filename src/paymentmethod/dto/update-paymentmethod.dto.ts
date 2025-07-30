import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsBoolean, IsObject } from 'class-validator';

export class UpdatePaymentmethodDto {
  @ApiPropertyOptional({
    description: 'Mengaktifkan atau menonaktifkan metode pembayaran.',
    example: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Objek konfigurasi untuk payment gateway (e.g., API keys).',
    example: { "serverKey": "YOUR_SERVER_KEY", "clientKey": "YOUR_CLIENT_KEY" },
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  config?: object;
}
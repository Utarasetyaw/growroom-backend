// src/paymentmethod/dto/update-paymentmethod.dto.ts

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
    description:
      'Objek konfigurasi untuk payment gateway. Kirim semua nilai yang ingin disimpan atau di-update.',
    examples: {
      PayPal: {
        value: {
          clientId: 'YOUR_PAYPAL_CLIENT_ID',
          clientSecret: 'YOUR_PAYPAL_SECRET',
          webhookId: 'YOUR_PAYPAL_WEBHOOK_ID',
          mode: 'sandbox',
        },
      },
      Midtrans: {
        value: {
          serverKey: 'YOUR_MIDTRANS_SERVER_KEY',
          clientKey: 'YOUR_MIDTRANS_CLIENT_KEY',
          frontendUrl: 'https://your-shop.com/profile',
          mode: 'sandbox',
        },
      },
    },
    type: 'object',
    additionalProperties: true,
  })
  @IsOptional()
  @IsObject()
  config?: object;
}
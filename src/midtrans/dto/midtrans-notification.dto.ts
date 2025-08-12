// src/midtrans/dto/midtrans-notification.dto.ts
import { IsString, IsOptional } from 'class-validator';

export class MidtransNotificationDto {
  @IsString()
  transaction_status: string;

  @IsString()
  order_id: string;

  @IsString()
  gross_amount: string;

  @IsString()
  payment_type: string;

  @IsString()
  signature_key: string;

  @IsString()
  status_code: string;

  @IsOptional()
  @IsString()
  fraud_status?: string;
}
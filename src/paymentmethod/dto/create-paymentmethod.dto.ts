// src/payment-methods/dto/create-paymentmethod.dto.ts
import { IsString, IsNotEmpty, IsBoolean, IsOptional, IsObject } from 'class-validator';

export class CreatePaymentMethodDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsObject()
  @IsOptional()
  config?: Record<string, any>;
}

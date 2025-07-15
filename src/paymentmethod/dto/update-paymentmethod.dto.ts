import { IsOptional, IsBoolean, IsObject } from 'class-validator';

export class UpdatePaymentmethodDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  config?: object;
}

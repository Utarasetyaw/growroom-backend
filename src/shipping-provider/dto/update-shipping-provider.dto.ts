// src/shipping-provider/dto/update-shipping-provider.dto.ts
import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class UpdateShippingProviderDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  credentials?: object;
}

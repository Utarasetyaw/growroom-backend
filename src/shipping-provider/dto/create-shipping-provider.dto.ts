// src/shipping-provider/dto/create-shipping-provider.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class CreateShippingProviderDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean = true;

  @IsOptional()
  @IsObject()
  credentials?: object;
}

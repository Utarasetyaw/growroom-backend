// src/currencies/dto/update-currency.dto.ts
import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateCurrencyDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

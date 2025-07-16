import { IsNumber, IsString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateShippingRateDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

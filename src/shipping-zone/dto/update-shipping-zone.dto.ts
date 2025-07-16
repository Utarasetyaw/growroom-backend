import { IsString, IsNumber, IsOptional, Min, IsBoolean } from 'class-validator';

export class UpdateShippingZoneDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

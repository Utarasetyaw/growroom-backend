import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateShippingZoneDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

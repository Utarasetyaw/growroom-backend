import { IsNotEmpty, IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateShippingZoneDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}

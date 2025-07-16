import { IsNotEmpty, IsNumber, IsInt, IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateShippingRateDto {
  @IsNotEmpty()
  @IsString()
  city: string;

  @IsNotEmpty()
  @IsNumber()
  price: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsNotEmpty()
  @IsInt()
  zoneId: number;
}

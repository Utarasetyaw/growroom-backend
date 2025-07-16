import { IsString, IsNotEmpty, IsNumber, Min, IsBoolean, IsOptional } from 'class-validator';

export class CreateShippingZoneDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsIn } from 'class-validator';

export class UpdateShippingModeDto {
  @ApiProperty({
    description: 'Mode kalkulasi pengiriman yang aktif.',
    example: 'auto',
    enum: ['auto', 'manual'],
  })
  @IsString()
  @IsIn(['auto', 'manual'])
  shippingMode: string;
}

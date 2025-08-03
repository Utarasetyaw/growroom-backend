import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class UpdateCartItemDto {
  @ApiProperty({ description: 'Jumlah kuantitas produk yang baru', example: 3 })
  @IsInt()
  @Min(1)
  quantity: number;
}
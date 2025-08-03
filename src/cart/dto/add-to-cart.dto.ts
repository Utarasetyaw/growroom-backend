import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';

export class AddToCartDto {
  @ApiProperty({ description: 'ID dari produk yang ditambahkan', example: 1 })
  @IsInt()
  productId: number;

  @ApiProperty({ description: 'Jumlah kuantitas produk', example: 1, default: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}
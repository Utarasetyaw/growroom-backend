import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, ArrayMinSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CartItemDto {
  @IsNotEmpty()
  productId: number;
}

export class ValidateVoucherDto {
  @ApiProperty({ description: 'Kode voucher yang ingin divalidasi', example: 'GAJIAN10' })
  @IsString()
  @IsNotEmpty()
  voucherCode: string;

  @ApiProperty({ description: 'Array berisi item di keranjang', type: [CartItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  cartItems: CartItemDto[];
}
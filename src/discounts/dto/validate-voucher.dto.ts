// File: src/discounts/dto/validate-voucher.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, ArrayMinSize, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

// DTO internal untuk merepresentasikan satu item di keranjang
class CartItemDto {
  @IsInt()
  @IsNotEmpty()
  productId: number;
}

// DTO utama untuk validasi voucher
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
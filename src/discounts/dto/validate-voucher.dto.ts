import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, ArrayMinSize, ValidateNested, IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

// DTO internal untuk merepresentasikan satu item di keranjang
class CartItemDto {
  @ApiProperty({ description: 'ID produk di keranjang', example: 1 })
  @IsInt()
  @IsNotEmpty()
  productId: number;

  // --- TAMBAHKAN properti quantity (opsional) ---
  // Ini untuk mencegah error validasi saat data dikirim dari service lain
  @ApiProperty({ description: 'Kuantitas item', example: 1, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
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
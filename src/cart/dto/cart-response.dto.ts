// File: src/cart/dto/cart-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { ProductResponseDto } from '../../products/dto/product-response.dto'; // Menggunakan kembali DTO Produk

class CartItemResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  quantity: number;

  @ApiProperty({ type: () => ProductResponseDto }) // Menampilkan detail produk
  product: ProductResponseDto;
}

export class CartResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiProperty({ type: [CartItemResponseDto] })
  items: CartItemResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}

// DTO sederhana untuk respons pesan sukses
export class MessageResponseDto {
  @ApiProperty({ example: 'Action completed successfully' })
  message: string;
}
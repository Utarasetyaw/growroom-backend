import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsNumber, IsArray, IsInt, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CreateOrderItemDto {
  @ApiProperty({ description: 'ID produk yang dipesan.', example: 1 })
  @IsInt()
  productId: number;

  @ApiProperty({ description: 'Harga produk saat pemesanan.', example: 150000 })
  @IsNumber()
  price: number;

  @ApiProperty({ description: 'Jumlah kuantitas produk.', example: 2 })
  @IsInt()
  @Min(1)
  qty: number;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'Alamat lengkap pengiriman.', example: 'Jl. Sudirman No. 123, Jakarta' })
  @IsNotEmpty()
  @IsString()
  address: string;

  @ApiProperty({ description: 'Biaya pengiriman.', example: 15000 })
  @IsNumber()
  shippingCost: number;

  @ApiProperty({ description: 'Subtotal harga semua barang.', example: 300000 })
  @IsNumber()
  subtotal: number;

  @ApiProperty({ description: 'Total harga (subtotal + ongkir).', example: 315000 })
  @IsNumber()
  total: number;

  @ApiProperty({ description: 'ID dari metode pembayaran yang dipilih.', example: 1 })
  @IsInt()
  paymentMethodId: number;

  @ApiProperty({ description: 'List barang yang dipesan.', type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  orderItems: CreateOrderItemDto[];
}
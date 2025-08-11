import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsArray, IsInt, Min, ValidateNested, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

class CreateOrderItemDto {
  @ApiProperty({ description: 'ID produk yang dipesan.', example: 1 })
  @IsInt()
  productId: number;

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

  @ApiProperty({ description: 'ID dari metode pembayaran yang dipilih.', example: 1 })
  @IsInt()
  paymentMethodId: number;

  @ApiProperty({ description: 'List barang yang dipesan.', type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  orderItems: CreateOrderItemDto[];

  @ApiProperty({ description: 'Kode mata uang yang digunakan saat checkout (e.g., "IDR", "USD").', example: 'IDR' })
  @IsString()
  @IsNotEmpty()
  currencyCode: string;

  @ApiPropertyOptional({ description: 'ID dari tarif pengiriman (kota) yang dipilih. Diperlukan jika pengiriman tidak gratis.', example: 5 })
  @IsInt()
  @IsOptional()
  shippingRateId?: number;
}
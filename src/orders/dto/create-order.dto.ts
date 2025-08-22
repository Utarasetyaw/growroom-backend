import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsArray,
  IsInt,
  Min,
  ValidateNested,
  IsOptional,
  ArrayMinSize,
  MinLength,
  IsUppercase,
  Length,
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateOrderItemDto {
  @ApiProperty({ description: 'ID produk yang dipesan.', example: 1 })
  @IsInt()
  productId: number;

  @ApiProperty({ description: 'Jumlah kuantitas produk.', example: 2 })
  @IsInt()
  @Min(1, { message: 'Jumlah kuantitas minimal adalah 1.' })
  qty: number;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'Alamat lengkap pengiriman.', example: 'Jl. Sudirman No. 123, Jakarta' })
  @IsString()
  @IsNotEmpty({ message: 'Alamat tidak boleh kosong.' })
  @MinLength(10, { message: 'Alamat terlalu pendek, mohon berikan alamat yang lebih lengkap.' })
  address: string;

  @ApiProperty({ description: 'ID dari metode pembayaran yang dipilih.', example: 1 })
  @IsInt()
  paymentMethodId: number;

  @ApiProperty({ description: 'List barang yang dipesan.', type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: 'Keranjang belanja tidak boleh kosong.' })
  @Type(() => CreateOrderItemDto)
  orderItems: CreateOrderItemDto[];

  @ApiProperty({ description: 'Kode mata uang 3 digit (ISO 4217).', example: 'IDR' })
  @IsString()
  @IsNotEmpty()
  @IsUppercase({ message: 'Kode mata uang harus dalam format huruf kapital.' })
  @Length(3, 3, { message: 'Kode mata uang harus terdiri dari 3 karakter.' })
  currencyCode: string;

  @ApiPropertyOptional({ description: 'ID dari tarif pengiriman yang dipilih.', example: 5 })
  @IsOptional()
  @IsInt()
  shippingRateId?: number;
}
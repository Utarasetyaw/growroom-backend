import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsNotEmpty, MinLength } from 'class-validator';
import { PaymentStatus, OrderStatus } from '@prisma/client';

export class UpdateOrderDto {
  @ApiPropertyOptional({ 
    enum: PaymentStatus, 
    description: 'Status pembayaran baru.' 
  })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ 
    enum: OrderStatus, 
    description: 'Status pesanan baru.' 
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  orderStatus?: OrderStatus;

  @ApiPropertyOptional({
    description: 'Nomor resi pengiriman. Biasanya diisi saat status diubah menjadi SHIPPING.',
    example: 'JN1234567890',
  })
  @IsOptional()
  @IsString()
  // @IsNotEmpty memastikan jika properti ini dikirim, nilainya tidak boleh string kosong ""
  @IsNotEmpty({ message: 'Nomor resi tidak boleh kosong.' }) 
  // REVISI: Menambahkan validasi panjang minimal untuk nomor resi
  @MinLength(8, { message: 'Nomor resi tampaknya terlalu pendek.' })
  trackingNumber?: string;
}
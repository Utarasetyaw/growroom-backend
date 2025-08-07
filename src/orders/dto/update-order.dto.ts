import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsNotEmpty } from 'class-validator';
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

  // --- TAMBAHAN: Field untuk nomor resi pengiriman ---
  @ApiPropertyOptional({
    description: 'Nomor resi pengiriman. Biasanya diisi saat status diubah menjadi SHIPPING.',
    example: 'JN1234567890',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty() // Jika field ini dikirim, nilainya tidak boleh string kosong
  trackingNumber?: string;
}
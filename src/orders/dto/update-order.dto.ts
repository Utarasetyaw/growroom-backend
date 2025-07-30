import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum } from 'class-validator';
import { PaymentStatus, OrderStatus } from '@prisma/client';

export class UpdateOrderDto {
  @ApiPropertyOptional({ enum: PaymentStatus, description: 'Status pembayaran baru.' })
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @ApiPropertyOptional({ enum: OrderStatus, description: 'Status pesanan baru.' })
  @IsOptional()
  @IsEnum(OrderStatus)
  orderStatus?: OrderStatus;
}
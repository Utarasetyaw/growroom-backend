import { IsOptional, IsEnum } from 'class-validator';
import { PaymentStatus, OrderStatus } from '@prisma/client';

export class UpdateOrderDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsEnum(OrderStatus)
  orderStatus?: OrderStatus;
}

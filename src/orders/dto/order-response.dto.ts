import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus, PaymentStatus, Role } from '@prisma/client';

// DTO parsial untuk data yang berulang
class UserInOrderDto { @ApiProperty() id: number; @ApiProperty() name: string; @ApiProperty() email: string; }
class ProductInOrderDto { @ApiProperty() id: number; @ApiProperty() name: any; }
class PaymentMethodInOrderDto { @ApiProperty() id: number; @ApiProperty() name: string; @ApiProperty() code: string; }

class OrderItemInOrderDto {
  @ApiProperty() id: number;
  @ApiProperty() qty: number;
  @ApiProperty() price: number;
  @ApiProperty() subtotal: number;
  @ApiProperty({ type: ProductInOrderDto }) product: ProductInOrderDto;
}

export class OrderResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() address: string;
  @ApiProperty() shippingCost: number;
  @ApiProperty() subtotal: number;
  @ApiProperty() total: number;
  @ApiProperty({ enum: PaymentStatus }) paymentStatus: PaymentStatus;
  @ApiProperty({ enum: OrderStatus }) orderStatus: OrderStatus;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty({ type: UserInOrderDto }) user: UserInOrderDto;
  @ApiProperty({ type: PaymentMethodInOrderDto }) paymentMethod: PaymentMethodInOrderDto;
  @ApiProperty({ type: [OrderItemInOrderDto] }) orderItems: OrderItemInOrderDto[];
}
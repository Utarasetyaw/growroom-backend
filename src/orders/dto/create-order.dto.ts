import { IsNotEmpty, IsNumber, IsString, IsArray, ValidateNested, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemInput {
  @IsInt()
  productId: number;

  @IsInt()
  qty: number;

  @IsNumber()
  price: number;
}

export class CreateOrderDto {
  @IsNotEmpty() @IsInt()
  userId: number; // (ambil dari JWT, jangan dari client, pada real endpoint)

  @IsString()
  address: string;

  @IsNumber()
  shippingCost: number;

  @IsNumber()
  subtotal: number;

  @IsNumber()
  total: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemInput)
  orderItems: OrderItemInput[];

  @IsInt()
  paymentMethodId: number;
}

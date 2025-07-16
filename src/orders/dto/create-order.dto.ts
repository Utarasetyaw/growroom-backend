import {
  IsNotEmpty, IsString, IsNumber, IsOptional, IsArray, IsInt, Min, ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';

class CreateOrderItemDto {
  @IsInt()
  productId: number;

  @IsNumber()
  price: number;

  @IsInt()
  @Min(1)
  qty: number;
}

export class CreateOrderDto {
  @IsNotEmpty()
  @IsString()
  address: string;

  @IsNumber()
  shippingCost: number;

  @IsNumber()
  subtotal: number;

  @IsNumber()
  total: number;

  @IsInt()
  paymentMethodId: number; // Payment method (ID from PaymentMethod)

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  orderItems: CreateOrderItemDto[];
}

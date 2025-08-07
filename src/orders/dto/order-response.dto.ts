// File: src/orders/dto/order-response.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus, PaymentStatus } from '@prisma/client';

// DTO parsial untuk data yang berulang
class UserInOrderDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;
  
  @ApiProperty()
  email: string;
}

class ProductInOrderDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ description: 'Nama produk saat ini (bisa berubah). Untuk nama saat order, gunakan `productName` di OrderItem.'})
  name: any; // Tetap 'any' untuk JSON
}

class PaymentMethodInOrderDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  code: string;
}

// --- REVISI 2: Sertakan data snapshot di OrderItem DTO ---
class OrderItemInOrderDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  qty: number;

  @ApiProperty({ description: 'Harga satuan produk pada saat order.' })
  price: number;
  
  @ApiProperty({ description: 'Subtotal untuk item ini (price * qty).' })
  subtotal: number;

  @ApiPropertyOptional({ 
    description: 'Data produk saat ini. Bisa null jika produk sudah dihapus.',
    type: ProductInOrderDto 
  })
  product?: ProductInOrderDto;

  @ApiProperty({ description: 'Snapshot nama produk saat order dibuat.' })
  productName: any; // Tipe any untuk JSON

  @ApiProperty({ description: 'Snapshot varian produk saat order dibuat.' })
  productVariant: any; // Tipe any untuk JSON

  @ApiPropertyOptional({ description: 'Snapshot URL gambar produk saat order dibuat.' })
  productImage?: string;
}


// DTO utama untuk respons order
export class OrderResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  address: string;

  @ApiProperty()
  shippingCost: number;

  @ApiProperty()
  subtotal: number;

  @ApiProperty()
  total: number;

  @ApiProperty({ enum: PaymentStatus })
  paymentStatus: PaymentStatus;

  @ApiProperty({ enum: OrderStatus })
  orderStatus: OrderStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: UserInOrderDto })
  user: UserInOrderDto;

  @ApiProperty({ type: PaymentMethodInOrderDto })
  paymentMethod: PaymentMethodInOrderDto;

  @ApiProperty({ type: [OrderItemInOrderDto] })
  orderItems: OrderItemInOrderDto[];

  // --- REVISI 1: Tambahkan `paymentDueDate` ---
  @ApiPropertyOptional({ description: 'Batas waktu pembayaran untuk order ini.' })
  paymentDueDate?: Date;
}
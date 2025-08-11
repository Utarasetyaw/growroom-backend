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

  @ApiProperty({
    description:
      'Nama produk saat ini (bisa berubah). Untuk nama saat order, gunakan `productName` di OrderItem.',
  })
  name: any; // Tetap 'any' untuk JSON dari Prisma
}

class PaymentMethodInOrderDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  code: string;

  @ApiPropertyOptional({
    description:
      'Konfigurasi spesifik metode pembayaran (misal: API keys). Tidak untuk ditampilkan di frontend.',
  })
  config?: any;
}

// DTO untuk setiap item dalam pesanan
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
    type: ProductInOrderDto,
  })
  product?: ProductInOrderDto;

  @ApiProperty({ description: 'Snapshot nama produk saat order dibuat.' })
  productName: any; // Tipe 'any' untuk JSON dari Prisma

  @ApiProperty({ description: 'Snapshot varian produk saat order dibuat.' })
  productVariant: any; // Tipe 'any' untuk JSON dari Prisma

  @ApiPropertyOptional({
    description: 'Snapshot URL gambar produk saat order dibuat.',
  })
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
  
  @ApiProperty({ description: 'Kode mata uang yang digunakan untuk pesanan ini (e.g., "IDR", "USD").', example: 'IDR' })
  currencyCode: string;

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

  @ApiPropertyOptional({ type: PaymentMethodInOrderDto })
  paymentMethod?: PaymentMethodInOrderDto;

  @ApiProperty({ type: [OrderItemInOrderDto] })
  orderItems: OrderItemInOrderDto[];

  @ApiPropertyOptional({
    description: 'Batas waktu pembayaran untuk order ini.',
  })
  paymentDueDate?: Date;
}
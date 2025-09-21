import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus, PaymentStatus, DiscountType } from '@prisma/client';

// DTO khusus untuk menangani nama dalam berbagai bahasa
class MultiLanguageNameDto {
  @ApiPropertyOptional({ type: String, example: 'Product Name in English' })
  en?: string;
  @ApiPropertyOptional({ type: String, example: 'Nama Produk dalam Bahasa Indonesia' })
  id?: string;
}

// DTO parsial untuk data yang berulang
class UserInOrderDto {
  @ApiProperty({ example: 101 })
  id: number;

  @ApiProperty({ example: 'John Doe' })
  name: string;

  @ApiProperty({ example: 'john.doe@example.com' })
  email: string;
}

class ProductInOrderDto {
  @ApiProperty({ example: 12 })
  id: number;

  @ApiProperty({
    description: 'Nama produk dalam format multilingual.',
    type: MultiLanguageNameDto,
  })
  name: MultiLanguageNameDto;
}

class PaymentMethodInOrderDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: 'Bank Transfer' })
  name: string;

  @ApiProperty({ example: 'bank_transfer' })
  code: string;
}

// DTO untuk setiap item dalam pesanan
class OrderItemInOrderDto {
  @ApiProperty({ example: 201 })
  id: number;

  @ApiProperty({ example: 2 })
  qty: number;

  @ApiProperty({ description: 'Harga satuan produk pada saat order.', example: 150000 })
  price: number;

  @ApiProperty({ description: 'Subtotal untuk item ini (price * qty).', example: 300000 })
  subtotal: number;

  @ApiPropertyOptional({
    description: 'Data produk saat ini. Bisa null jika produk sudah dihapus.',
    type: ProductInOrderDto,
  })
  product?: ProductInOrderDto;

  @ApiProperty({ 
    description: 'Snapshot nama produk saat order dibuat.',
    type: MultiLanguageNameDto,
  })
  productName: MultiLanguageNameDto;

  @ApiPropertyOptional({ 
    description: 'Snapshot varian produk saat order dibuat.',
    type: MultiLanguageNameDto,
  })
  productVariant?: MultiLanguageNameDto;

  @ApiPropertyOptional({
    description: 'Snapshot URL gambar produk saat order dibuat.',
    example: '/uploads/products/image.jpg',
  })
  productImage?: string;
}

// --- TAMBAHAN: DTO untuk menampilkan detail diskon yang diterapkan ---
class AppliedDiscountDto {
  @ApiProperty({ example: 'Diskon Kilat Akhir Pekan' })
  discountName: string;

  @ApiProperty({ enum: DiscountType, example: DiscountType.VOUCHER })
  discountType: DiscountType;
  
  @ApiProperty({ description: 'Jumlah potongan harga yang diberikan oleh diskon ini.', example: 15000 })
  amount: number;
}


// DTO utama untuk respons order
export class OrderResponseDto {
  @ApiProperty({ example: 501 })
  id: number;

  @ApiProperty({ example: 'Jl. Merdeka No. 45, Bandung' })
  address: string;

  @ApiProperty({ example: 15000 })
  shippingCost: number;

  @ApiProperty({ description: 'Subtotal asli sebelum diskon.', example: 300000 })
  subtotal: number;

  // --- TAMBAHAN: Field untuk rekap diskon ---
  @ApiProperty({ description: 'Total diskon dari promo SALE (harga coret).', example: 30000 })
  saleDiscountAmount: number;

  @ApiProperty({ description: 'Total diskon dari VOUCHER.', example: 15000 })
  voucherDiscountAmount: number;
  
  @ApiProperty({ description: 'Total akhir setelah dikurangi semua diskon dan ditambah ongkir.', example: 270000 })
  total: number;
  
  @ApiProperty({ description: 'Kode mata uang (ISO 4217).', example: 'IDR' })
  currencyCode: string;

  @ApiProperty({ enum: PaymentStatus, example: PaymentStatus.PAID })
  paymentStatus: PaymentStatus;

  @ApiProperty({ enum: OrderStatus, example: OrderStatus.PROCESSING })
  orderStatus: OrderStatus;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional({
    description: 'Batas waktu pembayaran untuk order ini.',
  })
  paymentDueDate?: Date;

  @ApiProperty({ type: UserInOrderDto })
  user: UserInOrderDto;

  @ApiPropertyOptional({ type: PaymentMethodInOrderDto })
  paymentMethod?: PaymentMethodInOrderDto;

  @ApiProperty({ type: [OrderItemInOrderDto] })
  orderItems: OrderItemInOrderDto[];

  // --- TAMBAHAN: Field untuk rincian diskon ---
  @ApiProperty({ 
    type: [AppliedDiscountDto],
    description: 'Daftar detail diskon yang diterapkan pada pesanan ini.'
  })
  appliedDiscounts: AppliedDiscountDto[];
}
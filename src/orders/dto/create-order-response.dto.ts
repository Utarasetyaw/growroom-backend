// File: src/orders/dto/create-order-response.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus, PaymentStatus } from '@prisma/client';

// --- DTO DASAR (ASUMSI DARI KONTEKS SEBELUMNYA) ---
// DTO ini mendefinisikan bentuk dasar dari sebuah Order.
class UserInOrderDto { @ApiProperty() id: number; @ApiProperty() name: string; }
class PaymentMethodInOrderDto { @ApiProperty() id: number; @ApiProperty() name: string; }
class ProductInOrderDto { @ApiProperty() id: number; @ApiProperty() name: any; }
class OrderItemInOrderDto {
  @ApiProperty() id: number;
  @ApiProperty() qty: number;
  @ApiProperty() price: number;
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
  
  // --- REVISI 1: Tambahkan `paymentDueDate` di DTO dasar ---
  @ApiPropertyOptional({ description: 'Batas waktu pembayaran untuk order ini.' })
  paymentDueDate?: Date;
}


// --- DTO BARU: Untuk memperjelas struktur instruksi pembayaran manual ---
class ManualPaymentInstructionsDto {
    @ApiProperty()
    bank: string;

    @ApiProperty()
    accountHolder: string;

    @ApiProperty()
    accountNumber: string;

    @ApiProperty()
    amount: number;

    @ApiProperty()
    paymentDueDate: Date;
}


// --- DTO UTAMA YANG DIREVISI ---
export class CreateOrderResponseDto extends OrderResponseDto {
  @ApiPropertyOptional({ 
    description: 'Tipe pembayaran yang diproses (e.g., MANUAL, MIDTRANS, PAYPAL).', 
    example: 'MANUAL' 
  })
  paymentType?: string;

  @ApiPropertyOptional({ description: 'Token Snap Midtrans untuk ditampilkan di front-end.' })
  snapToken?: string;

  @ApiPropertyOptional({ description: 'URL redirect pembayaran Midtrans.' })
  redirectUrl?: string;

  @ApiPropertyOptional({ description: 'URL approval untuk pembayaran PayPal.' })
  approvalUrl?: string;

  // --- REVISI 2: Gunakan DTO spesifik untuk `instructions` ---
  @ApiPropertyOptional({ 
    description: 'Instruksi untuk pembayaran manual (transfer bank atau Wise).', 
    type: ManualPaymentInstructionsDto 
  })
  instructions?: ManualPaymentInstructionsDto;
}
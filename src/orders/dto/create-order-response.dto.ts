import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
// --- DITAMBAHKAN: Impor DTO utama dari file sumbernya ---
import { OrderResponseDto } from './order-response.dto';

// --- DIHAPUS: Definisi DTO duplikat seperti UserInOrderDto, OrderItemInOrderDto, dan OrderResponseDto dihilangkan dari sini. ---
// Kita akan menggunakan versi yang sudah ada di 'order-response.dto.ts'.

/**
 * DTO untuk instruksi pembayaran manual (Transfer Bank, Wise, dll.)
 * DTO ini tetap di sini karena spesifik untuk respons pembuatan order.
 */
class ManualPaymentInstructionsDto {
  @ApiProperty({ example: 'Bank Central Asia' })
  bank: string;

  @ApiProperty({ example: 'PT. Grow Room Sejahtera' })
  accountHolder: string;

  @ApiProperty({ example: '8881234567' })
  accountNumber: string;

  @ApiProperty({ example: 165000 })
  amount: number;

  @ApiProperty()
  paymentDueDate: Date;
}

/**
 * DTO utama untuk respons setelah berhasil membuat pesanan baru.
 * Mewarisi semua properti dari OrderResponseDto dan menambahkan detail pembayaran.
 */
export class CreateOrderResponseDto extends OrderResponseDto {
  @ApiPropertyOptional({
    description: 'Tipe pembayaran yang diproses (e.g., MANUAL, MIDTRANS, PAYPAL).',
    example: 'MIDTRANS',
  })
  paymentType?: string;

  @ApiPropertyOptional({
    description: 'Token Snap Midtrans untuk ditampilkan di front-end (jika menggunakan Midtrans).',
  })
  snapToken?: string;

  @ApiPropertyOptional({
    description: 'URL redirect pembayaran Midtrans (jika menggunakan Midtrans).',
  })
  redirectUrl?: string;

  @ApiPropertyOptional({
    description: 'URL approval untuk pembayaran PayPal (jika menggunakan PayPal).',
  })
  approvalUrl?: string;

  @ApiPropertyOptional({
    description: 'Instruksi untuk pembayaran manual (jika menggunakan transfer bank atau Wise).',
    type: ManualPaymentInstructionsDto,
  })
  instructions?: ManualPaymentInstructionsDto;
}
import { ApiProperty } from '@nestjs/swagger';
import { OrderResponseDto } from './order-response.dto';

// 1. DTO untuk respons pembayaran via Midtrans (Tidak ada perubahan)
class MidtransPaymentResponse {
  @ApiProperty({ example: 'MIDTRANS' })
  paymentType: string;

  @ApiProperty({ description: 'Token yang digunakan oleh Snap.js di frontend.' })
  snapToken: string;

  @ApiProperty({ description: 'URL untuk redirect ke halaman pembayaran Midtrans.' })
  redirectUrl: string;

  @ApiProperty({ description: 'ID order internal dari sistem kita.' })
  internalOrderId: number;
}

// 2. DTO untuk respons pembayaran via PayPal (REVISI)
class PaypalPaymentResponse {
  @ApiProperty({ example: 'PAYPAL_CHECKOUT' })
  paymentType: string;

  @ApiProperty({ description: 'ID order yang dibuat oleh PayPal untuk memulai proses pembayaran.' })
  paypalOrderId: string;

  // --- DIHAPUS ---
  // Properti 'internalOrderId' dihapus karena pada tahap ini,
  // order internal belum dibuat. Order internal baru akan dibuat
  // setelah pembayaran berhasil di-capture.
}

// 3. DTO untuk instruksi pembayaran manual (Tidak ada perubahan)
class ManualPaymentInstructions {
    @ApiProperty({ example: 'BCA' })
    bank: string;

    @ApiProperty({ example: '1234567890' })
    accountNumber: string;

    @ApiProperty({ example: 'PT. Toko Jaya' })
    accountName: string;

    @ApiProperty({ description: 'Jumlah yang harus dibayar.' })
    amount: number;

    @ApiProperty({ description: 'Batas waktu pembayaran.' })
    paymentDueDate: Date;
}

// 4. DTO untuk respons pembayaran manual (Tidak ada perubahan)
class ManualPaymentResponse extends OrderResponseDto {
    @ApiProperty({ example: 'MANUAL' })
    paymentType: string;

    @ApiProperty({ type: ManualPaymentInstructions })
    instructions: ManualPaymentInstructions;
}

// 5. DTO untuk respons pembayaran yang ditunda (Tidak ada perubahan)
class DeferredPaymentResponse extends OrderResponseDto {
    @ApiProperty({ example: 'DEFERRED' })
    paymentType: string;
}

// DTO Utama yang Menggabungkan Semua Kemungkinan Respons
export class CreateOrderResponse {
  @ApiProperty({
    description: 'Respons akan cocok dengan salah satu skema berikut, tergantung metode pembayaran yang dipilih saat membuat order.',
    oneOf: [
      { $ref: '#/components/schemas/MidtransPaymentResponse' },
      { $ref: '#/components/schemas/PaypalPaymentResponse' },
      { $ref: '#/components/schemas/ManualPaymentResponse' },
      { $ref: '#/components/schemas/DeferredPaymentResponse' },
    ],
  })
  response: 
    | MidtransPaymentResponse 
    | PaypalPaymentResponse 
    | ManualPaymentResponse 
    | DeferredPaymentResponse;
}

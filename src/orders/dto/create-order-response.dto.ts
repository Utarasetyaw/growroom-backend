import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderResponseDto } from './order-response.dto';

export class CreateOrderResponseDto extends OrderResponseDto {
  @ApiPropertyOptional({ description: 'Tipe pembayaran (e.g., BANK_TRANSFER, MIDTRANS).', example: 'MIDTRANS' })
  paymentType?: string;

  @ApiPropertyOptional({ description: 'Token Snap Midtrans untuk ditampilkan di front-end.' })
  snapToken?: string;

  @ApiPropertyOptional({ description: 'URL redirect pembayaran Midtrans.' })
  redirectUrl?: string;

  @ApiPropertyOptional({ description: 'URL approval untuk pembayaran PayPal.' })
  approvalUrl?: string;

  @ApiPropertyOptional({ description: 'Instruksi untuk pembayaran manual (transfer bank).', type: 'object', additionalProperties: true })
  instructions?: any;
}
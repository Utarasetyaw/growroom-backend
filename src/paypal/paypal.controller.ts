import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
  Param,
  UseGuards,
} from '@nestjs/common';
import { PaypalService } from './paypal.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'; // 1. Impor Guard

@ApiTags('PayPal')
@Controller('paypal')
export class PaypalController {
  constructor(private readonly paypalService: PaypalService) {}

  // --- ENDPOINT BARU: Membuat Order di sisi PayPal ---
  // Endpoint ini dipanggil oleh frontend sebelum menampilkan form kartu kredit.
  @Post('orders')
  @UseGuards(JwtAuthGuard) // 2. Lindungi endpoint, hanya user terotentikasi yang bisa membuat order
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Membuat order di sisi PayPal (untuk Expanded Checkout)' })
  async createOrder(@Body('orderId') orderId: number) {
    const paypalOrder = await this.paypalService.createOrder(orderId);
    // Kita hanya perlu mengirim kembali ID order yang dibuat oleh PayPal
    return { id: paypalOrder.id };
  }

  // --- ENDPOINT BARU: Menyelesaikan (Capture) Pembayaran ---
  // Endpoint ini dipanggil setelah frontend mendapat persetujuan dari form kartu.
  @Post('orders/:orderID/capture')
  @UseGuards(JwtAuthGuard) // 3. Lindungi endpoint ini juga
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Menyelesaikan (capture) pembayaran PayPal' })
  async captureOrder(@Param('orderID') orderID: string) {
    return this.paypalService.captureOrder(orderID);
  }

  // --- Endpoint Webhook (Tetap Ada) ---
  // Endpoint ini tetap publik untuk menerima notifikasi dari server PayPal.
  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Endpoint untuk menerima notifikasi webhook dari PayPal' })
  handleWebhook(@Headers() headers: any, @Body() body: any) {
    return this.paypalService.handleWebhook(headers, body);
  }
}
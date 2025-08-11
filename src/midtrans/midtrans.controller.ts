import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger, // 1. Impor Logger
} from '@nestjs/common';
import { MidtransService } from './midtrans.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Midtrans')
@Controller('midtrans')
export class MidtransController {
  // 2. Buat instance Logger untuk mencatat pesan
  private readonly logger = new Logger(MidtransController.name);

  constructor(private readonly midtransService: MidtransService) {}

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Endpoint untuk menerima notifikasi pembayaran dari Midtrans',
  })
  @ApiResponse({ status: 200, description: 'Notifikasi berhasil diterima.' })
  // 3. Jadikan method ini async
  async handlePaymentNotification(@Body() notificationPayload: any) {
    // 4. Gunakan blok try...catch untuk menangani error
    try {
      // Catat payload yang masuk agar kita tahu apa yang dikirim Midtrans
      this.logger.log(
        `Webhook received! Payload: ${JSON.stringify(notificationPayload)}`,
      );

      // Jalankan logika seperti biasa
      return await this.midtransService.handlePaymentNotification(
        notificationPayload,
      );
    } catch (error) {
      // Jika terjadi error saat memproses, catat error tersebut secara detail
      this.logger.error(
        `Error processing webhook: ${error.message}`,
        error.stack,
      );
      // Kirim respons bahwa ada error, tapi status tetap 200 OK
      // agar Midtrans tidak mengirim ulang notifikasi yang gagal.
      return { status: 'error', message: 'Internal server error while processing notification.' };
    }
  }
}
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { MidtransService } from './midtrans.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Midtrans')
@Controller('midtrans')
export class MidtransController {
  constructor(private readonly midtransService: MidtransService) {}

  @Public() // Endpoint ini harus bisa diakses publik oleh server Midtrans
  @Post('webhook')
  @HttpCode(HttpStatus.OK) // Selalu kirim status 200 OK agar Midtrans tidak mengirim ulang
  @ApiOperation({
    summary: 'Endpoint untuk menerima notifikasi pembayaran dari Midtrans',
  })
  @ApiResponse({ status: 200, description: 'Notifikasi berhasil diterima.' })
  handlePaymentNotification(@Body() notificationPayload: any) {
    // Teruskan payload ke service untuk diproses
    return this.midtransService.handlePaymentNotification(notificationPayload);
  }
}
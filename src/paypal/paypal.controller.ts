// src/paypal/paypal.controller.ts

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
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('PayPal')
@Controller('paypal')
export class PaypalController {
  constructor(private readonly paypalService: PaypalService) {}

  @Post('orders/:paypalOrderId/capture')
  @UseGuards(JwtAuthGuard) // Tetap gunakan guard untuk keamanan lapisan dasar.
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Menyelesaikan (capture) pembayaran PayPal' })
  @ApiResponse({ status: 201, description: 'Payment captured successfully.'})
  async captureOrder(@Param('paypalOrderId') paypalOrderId: string) {
    // Validasi user tidak diperlukan secara ketat di sini karena `paypalOrderId`
    // sudah unik dan didapat dari alur yang aman.
    return this.paypalService.captureOrder(paypalOrderId);
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Menerima notifikasi webhook dari PayPal' })
  handleWebhook(@Headers() headers: any, @Body() body: any) {
    return this.paypalService.handleWebhook(headers, body);
  }
}

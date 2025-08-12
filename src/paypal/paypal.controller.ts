import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
  Param,
  UseGuards,
  ParseIntPipe,
  Req,
} from '@nestjs/common';
import { PaypalService } from './paypal.service';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';

@ApiTags('PayPal')
@Controller('paypal')
export class PaypalController {
  constructor(private readonly paypalService: PaypalService) {}

  @Post('create-order')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Membuat order di PayPal (untuk Expanded Checkout)' })
  @ApiResponse({ status: 201, description: 'PayPal order created successfully.'})
  async createOrder(
      @Req() req: RequestWithUser, // Mengambil user yang login
      @Body('internalOrderId', ParseIntPipe) internalOrderId: number
  ) {
    // Ambil userId dari token JWT pengguna yang sedang login
    const userId = req.user.userId;

    // Teruskan userId ke service untuk validasi kepemilikan order
    const paypalOrder = await this.paypalService.createOrder(internalOrderId, userId);
    
    // Kirim kembali ID order dari PayPal ke frontend
    return { id: paypalOrder.id };
  }

  @Post('orders/:paypalOrderId/capture')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Menyelesaikan (capture) pembayaran PayPal' })
  @ApiResponse({ status: 201, description: 'Payment captured successfully.'})
  async captureOrder(@Param('paypalOrderId') paypalOrderId: string) {
    // Untuk capture, tidak perlu validasi user karena menggunakan ID unik dari PayPal
    // yang hanya didapat setelah createOrder berhasil.
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
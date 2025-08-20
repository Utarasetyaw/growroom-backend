import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
  Param,
  UseGuards,
  Req, // <-- 1. Impor 'Req' dari @nestjs/common
} from '@nestjs/common';
import { PaypalService } from './paypal.service';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface'; // <-- 2. Impor interface request
import { CreateOrderDto } from '../orders/dto/create-order.dto'; // <-- 3. Impor DTO untuk detail order

@ApiTags('PayPal')
@Controller('paypal')
export class PaypalController {
  constructor(private readonly paypalService: PaypalService) {}

  /**
   * REVISI: Endpoint ini sekarang tidak hanya melakukan 'capture' pembayaran,
   * tetapi juga bertanggung jawab untuk membuat order internal di database
   * SETELAH pembayaran dikonfirmasi berhasil.
   */
  @Post('orders/:paypalOrderId/capture')
  @UseGuards(JwtAuthGuard) // Tetap gunakan guard untuk keamanan
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Menyelesaikan (capture) pembayaran PayPal dan membuat order internal',
    description:
      'Frontend memanggil endpoint ini setelah user menyetujui pembayaran di jendela PayPal. Endpoint ini akan melakukan capture pembayaran ke PayPal, dan jika berhasil, akan membuat order di database sistem kita dengan status PAID.',
  })
  @ApiResponse({
    status: 201,
    description: 'Pembayaran berhasil di-capture dan order internal berhasil dibuat.',
  })
  async captureOrder(
    @Param('paypalOrderId') paypalOrderId: string,
    // <-- 4. Terima detail order asli (keranjang, alamat, dll) dari body request
    @Body() orderDetails: CreateOrderDto,
    // <-- 5. Gunakan @Req() untuk mendapatkan informasi user dari token JWT
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.userId;
    // <-- 6. Panggil service dengan semua data yang diperlukan
    return this.paypalService.captureAndCreateOrder(
      paypalOrderId,
      orderDetails,
      userId,
    );
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Menerima notifikasi webhook dari PayPal' })
  @ApiOkResponse({ description: 'Webhook diterima dan akan diproses.' })
  handleWebhook(@Headers() headers: any, @Body() body: any) {
    // Logika webhook tidak perlu diubah karena alur utama sudah benar
    return this.paypalService.handleWebhook(headers, body);
  }
}

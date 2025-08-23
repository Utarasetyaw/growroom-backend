import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
  Param,
  UseGuards,
  Req,
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
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
// CreateOrderDto tidak lagi dibutuhkan di sini
// import { CreateOrderDto } from '../orders/dto/create-order.dto'; 
import { OrderResponseDto } from '../orders/dto/order-response.dto';

@ApiTags('PayPal')
@Controller('paypal')
export class PaypalController {
  constructor(private readonly paypalService: PaypalService) {}

  /**
   * REVISI: Endpoint ini sekarang hanya melakukan 'capture' dan mengupdate order
   * yang sudah ada di database.
   */
  @Post('orders/:paypalOrderId/capture')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Menyelesaikan (capture) pembayaran PayPal dan mengupdate order internal',
    description:
      'Frontend memanggil endpoint ini setelah user menyetujui pembayaran di jendela PayPal. Endpoint ini akan melakukan capture pembayaran ke PayPal, dan jika berhasil, akan mengupdate status order di database sistem kita menjadi PAID.',
  })
  @ApiResponse({
    status: 200, // Status 200 OK karena ini adalah operasi update
    description: 'Pembayaran berhasil di-capture dan order internal berhasil diupdate.',
    type: OrderResponseDto, // Responsnya adalah data order yang sudah final
  })
  async captureOrder(
    @Param('paypalOrderId') paypalOrderId: string,
    // Body tidak lagi diperlukan
    @Req() req: RequestWithUser,
  ) {
    const userId = req.user.userId;
    // Panggil service yang sudah direvisi
    return this.paypalService.capturePaymentAndUpdateOrder(
      paypalOrderId,
      userId,
    );
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Menerima notifikasi webhook dari PayPal' })
  @ApiOkResponse({ description: 'Webhook diterima dan akan diproses.' })
  handleWebhook(@Headers() headers: any, @Body() body: any) {
    // Logika webhook tidak perlu diubah
    return this.paypalService.handleWebhook(headers, body);
  }
}

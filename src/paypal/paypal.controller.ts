import { Controller, Post, Body, HttpCode, HttpStatus, Headers } from '@nestjs/common';
import { PaypalService } from './paypal.service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('PayPal')
@Controller('paypal')
export class PaypalController {
  constructor(private readonly paypalService: PaypalService) {}

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Endpoint untuk menerima notifikasi dari PayPal' })
  handleWebhook(@Headers() headers: any, @Body() body: any) {
    return this.paypalService.handleWebhook(headers, body);
  }
}
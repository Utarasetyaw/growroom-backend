import { Controller, Get, Patch, Param, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiNotFoundResponse, ApiBody } from '@nestjs/swagger';
import { PaymentmethodService } from './paymentmethod.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UpdatePaymentmethodDto } from './dto/update-paymentmethod.dto';
import { PaymentMethodResponseDto } from './dto/payment-method-response.dto';

@ApiTags('Payment Methods')
@ApiBearerAuth()
@Controller('payment-methods')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentmethodController {
  constructor(private readonly service: PaymentmethodService) {}

  @Get()
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Mendapatkan semua metode pembayaran (Owner Only)' })
  @ApiResponse({ status: 200, description: 'List semua metode pembayaran.', type: [PaymentMethodResponseDto] })
  async findAll() {
    return this.service.findAll();
  }

  @Patch(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Update metode pembayaran (Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID dari metode pembayaran' })
  @ApiBody({ type: UpdatePaymentmethodDto })
  @ApiResponse({ status: 200, description: 'Metode pembayaran berhasil di-update.', type: PaymentMethodResponseDto })
  @ApiNotFoundResponse({ description: 'Metode pembayaran tidak ditemukan.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePaymentmethodDto,
  ) {
    return this.service.update(id, body);
  }
}
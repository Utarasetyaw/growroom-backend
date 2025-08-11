import { Controller, Get, Patch, Param, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiNotFoundResponse, ApiBody } from '@nestjs/swagger';
import { PaymentmethodService } from './paymentmethod.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UpdatePaymentmethodDto } from './dto/update-paymentmethod.dto';
import { PaymentMethodResponseDto } from './dto/payment-method-response.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Payment Methods')
@Controller('payment-methods')
// --- DIHAPUS DARI SINI ---
// @ApiBearerAuth()
// @UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentmethodController {
  constructor(private readonly service: PaymentmethodService) {}

  // --- Endpoint Publik untuk Frontend ---
  @Public()
  @Get('active')
  @ApiOperation({ summary: 'Mendapatkan semua metode pembayaran yang aktif (untuk publik)' })
  @ApiResponse({ status: 200, description: 'List metode pembayaran yang aktif dan aman.'})
  findAllActive() {
    return this.service.findAllActive();
  }

  // --- Endpoint di bawah ini khusus untuk Admin/Owner ---
  
  @Get()
  // --- DITAMBAHKAN DI SINI ---
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mendapatkan semua metode pembayaran (Owner Only)' })
  @ApiResponse({ status: 200, description: 'List semua metode pembayaran.', type: [PaymentMethodResponseDto] })
  findAll() {
    return this.service.findAll();
  }

  @Patch(':id')
  // --- DITAMBAHKAN DI SINI ---
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update metode pembayaran (Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID dari metode pembayaran' })
  @ApiBody({ type: UpdatePaymentmethodDto })
  @ApiResponse({ status: 200, description: 'Metode pembayaran berhasil di-update.', type: PaymentMethodResponseDto })
  @ApiNotFoundResponse({ description: 'Metode pembayaran tidak ditemukan.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePaymentmethodDto,
  ) {
    return this.service.update(id, body);
  }
}
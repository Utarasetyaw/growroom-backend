import {
  Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards, ValidationPipe, Logger, Req
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DiscountsService } from './discounts.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ValidateVoucherDto } from './dto/validate-voucher.dto'; // <-- 1. IMPORT DTO
import { RequestWithUser } from '../common/interfaces/request-with-user.interface'; // <-- 2. IMPORT TIPE REQUEST

@ApiTags('Discounts')
@Controller('discounts')
export class DiscountsController {
  private readonly logger = new Logger(DiscountsController.name);

  constructor(private readonly discountsService: DiscountsService) {}

  // --- 3. TAMBAHKAN ENDPOINT BARU UNTUK VALIDASI VOUCHER ---
  @Post('validate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER) // Endpoint ini hanya untuk user
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Memvalidasi kode voucher untuk keranjang belanja' })
  validateVoucher(
    @Req() req: RequestWithUser,
    @Body(new ValidationPipe({ whitelist: true })) validateVoucherDto: ValidateVoucherDto
  ) {
    this.logger.log(`User #${req.user.userId} memvalidasi voucher: ${validateVoucherDto.voucherCode}`);
    return this.discountsService.validateVoucher(req.user.userId, validateVoucherDto);
  }

  // Endpoint untuk membuat diskon (Admin/Owner)
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Membuat diskon/promo baru' })
  create(@Body(new ValidationPipe({ transform: true, whitelist: true })) createDiscountDto: CreateDiscountDto) {
    this.logger.log('Endpoint POST /discounts dipanggil...');
    return this.discountsService.create(createDiscountDto);
  }

  // Endpoint lain...
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Mendapatkan semua daftar diskon/promo' })
  findAll() {
    return this.discountsService.findAll();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Mendapatkan detail satu diskon/promo' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.discountsService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Memperbarui data diskon/promo' })
  update(@Param('id', ParseIntPipe) id: number, @Body(new ValidationPipe({ transform: true, whitelist: true })) updateDiscountDto: UpdateDiscountDto) {
    return this.discountsService.update(id, updateDiscountDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Menghapus diskon/promo' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.discountsService.remove(id);
  }
}
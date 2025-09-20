import {
  Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe, UseGuards, ValidationPipe, Logger
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DiscountsService } from './discounts.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Discounts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('discounts')
export class DiscountsController {
  // Tambahkan logger untuk logging yang lebih terstruktur
  private readonly logger = new Logger(DiscountsController.name);

  constructor(private readonly discountsService: DiscountsService) {}

  @Post()
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Membuat diskon/promo baru' })
  create(@Body(new ValidationPipe({ transform: true, whitelist: true })) createDiscountDto: CreateDiscountDto) {
    // --- LOG DITAMBAHKAN DI SINI ---
    this.logger.log('Endpoint POST /discounts dipanggil...');
    console.log('DTO yang diterima di Controller:', createDiscountDto);
    // --------------------------------

    return this.discountsService.create(createDiscountDto);
  }

  // ... (fungsi lain tidak perlu diubah)
  @Get()
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Mendapatkan semua daftar diskon/promo' })
  findAll() {
    return this.discountsService.findAll();
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Mendapatkan detail satu diskon/promo' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.discountsService.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Memperbarui data diskon/promo' })
  update(@Param('id', ParseIntPipe) id: number, @Body(ValidationPipe) updateDiscountDto: UpdateDiscountDto) {
    return this.discountsService.update(id, updateDiscountDto);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Menghapus diskon/promo' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.discountsService.remove(id);
  }
}
// File: src/discounts/discounts.controller.ts

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
  private readonly logger = new Logger(DiscountsController.name);

  constructor(private readonly discountsService: DiscountsService) {}

  // Endpoint ini sudah benar karena menggunakan CreateDiscountDto yang telah direvisi.
  @Post()
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Membuat diskon/promo baru' })
  create(@Body(new ValidationPipe({ transform: true, whitelist: true })) createDiscountDto: CreateDiscountDto) {
    this.logger.log('Endpoint POST /discounts dipanggil...');
    return this.discountsService.create(createDiscountDto);
  }

  // Endpoint ini tidak memerlukan perubahan.
  @Get()
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Mendapatkan semua daftar diskon/promo' })
  findAll() {
    return this.discountsService.findAll();
  }

  // Endpoint ini tidak memerlukan perubahan.
  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Mendapatkan detail satu diskon/promo' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.discountsService.findOne(id);
  }

  // Endpoint ini sudah benar karena menggunakan UpdateDiscountDto yang mewarisi revisi.
  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Memperbarui data diskon/promo' })
  update(@Param('id', ParseIntPipe) id: number, @Body(new ValidationPipe({ transform: true, whitelist: true })) updateDiscountDto: UpdateDiscountDto) {
    return this.discountsService.update(id, updateDiscountDto);
  }

  // Endpoint ini tidak memerlukan perubahan.
  @Delete(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Menghapus diskon/promo' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.discountsService.remove(id);
  }
}
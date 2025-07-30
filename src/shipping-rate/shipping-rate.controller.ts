import { Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiNotFoundResponse } from '@nestjs/swagger';
import { ShippingRateService } from './shipping-rate.service';
import { CreateShippingRateDto } from './dto/create-shipping-rate.dto';
import { UpdateShippingRateDto } from './dto/update-shipping-rate.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ShippingRateResponseDto } from './dto/shipping-rate-response.dto';

@ApiTags('Shipping Rates')
@ApiBearerAuth()
@Controller('shipping-rates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShippingRateController {
  constructor(private readonly service: ShippingRateService) {}

  @Get()
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Mendapatkan semua tarif pengiriman (Owner Only)' })
  @ApiResponse({ status: 200, type: [ShippingRateResponseDto] })
  async findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Mendapatkan detail satu tarif pengiriman (Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID dari tarif pengiriman' })
  @ApiResponse({ status: 200, type: ShippingRateResponseDto })
  @ApiNotFoundResponse({ description: 'Tarif tidak ditemukan.' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Membuat tarif pengiriman baru (Owner Only)' })
  @ApiResponse({ status: 201, type: ShippingRateResponseDto })
  async create(@Body() dto: CreateShippingRateDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Update tarif pengiriman (Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID dari tarif pengiriman' })
  @ApiResponse({ status: 200, type: ShippingRateResponseDto })
  @ApiNotFoundResponse({ description: 'Tarif tidak ditemukan.' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateShippingRateDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Menghapus tarif pengiriman (Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID dari tarif pengiriman' })
  @ApiResponse({ status: 200, description: 'Berhasil dihapus.' })
  @ApiNotFoundResponse({ description: 'Tarif tidak ditemukan.' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
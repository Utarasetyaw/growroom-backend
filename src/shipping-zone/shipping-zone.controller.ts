import { Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiNotFoundResponse } from '@nestjs/swagger';
import { ShippingZoneService } from './shipping-zone.service';
import { CreateShippingZoneDto } from './dto/create-shipping-zone.dto';
import { UpdateShippingZoneDto } from './dto/update-shipping-zone.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ShippingZoneResponseDto } from './dto/shipping-zone-response.dto';

@ApiTags('Shipping Zones')
@ApiBearerAuth()
@Controller('shipping-zones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShippingZoneController {
  constructor(private readonly service: ShippingZoneService) {}

  @Get()
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Mendapatkan semua zona pengiriman (Owner Only)' })
  @ApiResponse({ status: 200, type: [ShippingZoneResponseDto] })
  async findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Mendapatkan detail satu zona pengiriman (Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID dari zona pengiriman' })
  @ApiResponse({ status: 200, type: ShippingZoneResponseDto })
  @ApiNotFoundResponse({ description: 'Zona tidak ditemukan.' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Membuat zona pengiriman baru (Owner Only)' })
  @ApiResponse({ status: 201, type: ShippingZoneResponseDto })
  async create(@Body() dto: CreateShippingZoneDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Update zona pengiriman (Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID dari zona pengiriman' })
  @ApiResponse({ status: 200, type: ShippingZoneResponseDto })
  @ApiNotFoundResponse({ description: 'Zona tidak ditemukan.' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateShippingZoneDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Menghapus zona pengiriman (Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID dari zona pengiriman' })
  @ApiResponse({ status: 200, description: 'Berhasil dihapus.' })
  @ApiNotFoundResponse({ description: 'Zona tidak ditemukan.' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
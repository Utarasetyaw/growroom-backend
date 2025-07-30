import { Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiNotFoundResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { ShippingProviderService } from './shipping-provider.service';
import { CreateShippingProviderDto } from './dto/create-shipping-provider.dto';
import { UpdateShippingProviderDto } from './dto/update-shipping-provider.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ShippingProviderResponseDto } from './dto/shipping-provider-response.dto';

@ApiTags('Shipping Providers')
@ApiBearerAuth()
@Controller('shipping-providers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShippingProviderController {
  constructor(private readonly service: ShippingProviderService) {}

  @Get()
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Mendapatkan semua penyedia jasa pengiriman (Owner Only)' })
  @ApiResponse({ status: 200, type: [ShippingProviderResponseDto] })
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Membuat penyedia jasa pengiriman baru (Owner Only)' })
  @ApiResponse({ status: 201, type: ShippingProviderResponseDto })
  @ApiBadRequestResponse({ description: 'Kode sudah ada.' })
  create(@Body() dto: CreateShippingProviderDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Update penyedia jasa pengiriman (Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID dari penyedia jasa pengiriman' })
  @ApiResponse({ status: 200, type: ShippingProviderResponseDto })
  @ApiNotFoundResponse({ description: 'Penyedia jasa pengiriman tidak ditemukan.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateShippingProviderDto,
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Menghapus penyedia jasa pengiriman (Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID dari penyedia jasa pengiriman' })
  @ApiResponse({ status: 200, description: 'Berhasil dihapus.' })
  @ApiNotFoundResponse({ description: 'Penyedia jasa pengiriman tidak ditemukan.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
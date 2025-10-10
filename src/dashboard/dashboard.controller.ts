// src/dashboard/dashboard.controller.ts

import {
  Controller,
  Get,
  UseGuards,
  Patch,
  Body,
  Logger,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
import { UpdateBestProductsDto } from './dto/update-best-products.dto';
import { DashboardQueryDto } from './dto/dashboard-query.dto'; // Menggunakan DTO yang sudah kita definisikan

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly service: DashboardService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Mengambil data agregat untuk halaman dashboard' })
  @ApiResponse({ status: 200, type: DashboardResponseDto })
  // Dokumentasi untuk Swagger
  @ApiQuery({ name: 'revenuePeriod', required: false, enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom'] })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Format ISO 8601' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Format ISO 8601' })
  getDashboardData(@Query() query: DashboardQueryDto) {
    this.logger.log(`Endpoint GET /dashboard dipanggil dengan query: ${JSON.stringify(query)}`);
    return this.service.getDashboardData(query);
  }

  @Patch('best-products')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Update daftar produk unggulan (Owner Only)' })
  @ApiBody({ type: UpdateBestProductsDto })
  @ApiResponse({ status: 200, description: 'Produk unggulan berhasil diperbarui.' })
  updateBestProducts(@Body() dto: UpdateBestProductsDto) {
    this.logger.log('Endpoint PATCH /dashboard/best-products dipanggil...');
    return this.service.updateBestProducts(dto.productIds);
  }
}
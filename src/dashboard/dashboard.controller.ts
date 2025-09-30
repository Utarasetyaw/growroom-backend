// src/dashboard/dashboard.controller.ts
import {
  Controller,
  Get,
  UseGuards,
  Patch,
  Body,
  Logger,
  Query, // ▼▼▼ TAMBAHKAN IMPORT INI ▼▼▼
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
  ApiQuery, // ▼▼▼ TAMBAHKAN IMPORT INI ▼▼▼
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
import { UpdateBestProductsDto } from './dto/update-best-products.dto';
import { GetDashboardDataDto } from './dto/get-dashboard-data.dto'; // ▼▼▼ TAMBAHKAN IMPORT DTO ▼▼▼

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly service: DashboardService) {}

  // ▼▼▼ REVISI METHOD DI BAWAH INI ▼▼▼
  @Get()
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Mengambil data agregat untuk halaman dashboard' })
  @ApiResponse({ status: 200, type: DashboardResponseDto })
  // Tambahkan dekorator @ApiQuery untuk dokumentasi Swagger
  @ApiQuery({
    name: 'revenuePeriod',
    required: false,
    enum: ['daily', 'weekly', 'monthly', 'yearly', 'custom'],
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Format ISO 8601',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Format ISO 8601',
  })
  getDashboardData(@Query() query: GetDashboardDataDto) {
    // Terima query params melalui DTO
    this.logger.log(
      `Endpoint GET /dashboard dipanggil dengan filter: ${JSON.stringify(query)}`,
    );
    // Kirim query ke service untuk diproses
    return this.service.getDashboardData(query);
  }

  @Patch('best-products')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Update daftar produk unggulan (Owner Only)' })
  @ApiBody({ type: UpdateBestProductsDto })
  @ApiResponse({
    status: 200,
    description: 'Produk unggulan berhasil diperbarui.',
  })
  updateBestProducts(@Body() dto: UpdateBestProductsDto) {
    this.logger.log('Endpoint PATCH /dashboard/best-products dipanggil...');
    return this.service.updateBestProducts(dto.productIds);
  }
}

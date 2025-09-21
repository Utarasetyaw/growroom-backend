// src/dashboard/dashboard.controller.ts
import { Controller, Get, UseGuards, Patch, Body, Logger } from '@nestjs/common'; // <-- 1. Tambahkan Logger
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
import { UpdateBestProductsDto } from './dto/update-best-products.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  // --- 2. Inisialisasi Logger ---
  private readonly logger = new Logger(DashboardController.name);

  constructor(private readonly service: DashboardService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Mengambil data agregat untuk halaman dashboard' })
  @ApiResponse({ status: 200, type: DashboardResponseDto })
  getDashboardData() {
    // --- 3. Tambahkan Log ---
    this.logger.log('Endpoint GET /dashboard dipanggil...');
    return this.service.getDashboardData();
  }

  @Patch('best-products')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Update daftar produk unggulan (Owner Only)' })
  @ApiBody({ type: UpdateBestProductsDto })
  @ApiResponse({ status: 200, description: 'Produk unggulan berhasil diperbarui.' })
  updateBestProducts(@Body() dto: UpdateBestProductsDto) {
    // --- 3. Tambahkan Log ---
    this.logger.log('Endpoint PATCH /dashboard/best-products dipanggil...');
    return this.service.updateBestProducts(dto.productIds);
  }
}
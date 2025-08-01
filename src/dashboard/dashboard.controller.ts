// src/dashboard/dashboard.controller.ts
import { Controller, Get, UseGuards, Patch, Body } from '@nestjs/common'; // Tambahkan Patch, Body
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger'; // Tambahkan ApiBody
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { DashboardResponseDto } from './dto/dashboard-response.dto';
import { UpdateBestProductsDto } from './dto/update-best-products.dto'; // Impor DTO baru

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Mengambil data agregat untuk halaman dashboard' })
  @ApiResponse({ status: 200, type: DashboardResponseDto })
  getDashboardData() {
    return this.service.getDashboardData();
  }

  @Patch('best-products')
  @Roles(Role.OWNER) // Hanya OWNER yang bisa mengakses
  @ApiOperation({ summary: 'Update daftar produk unggulan (Owner Only)' })
  @ApiBody({ type: UpdateBestProductsDto })
  @ApiResponse({ status: 200, description: 'Produk unggulan berhasil diperbarui.' })
  updateBestProducts(@Body() dto: UpdateBestProductsDto) {
    return this.service.updateBestProducts(dto.productIds);
  }
}

// src/dashboard/dashboard.controller.ts
import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { DashboardResponseDto } from './dto/dashboard-response.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({
    summary: 'Mengambil data agregat untuk halaman dashboard (Owner/Admin Only)',
    description: 'Mengembalikan statistik order hari ini, grafik pendapatan per jam, dan daftar produk unggulan.'
  })
  @ApiResponse({ status: 200, description: 'Data dashboard berhasil diambil.', type: DashboardResponseDto })
  getDashboardData() {
    return this.service.getDashboardData();
  }
}
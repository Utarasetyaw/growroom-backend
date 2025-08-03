import { Controller, Get } from '@nestjs/common';
import { UserFrontendService } from './user_frontend.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Frontend - User View')
@Controller('user-frontend')
export class UserFrontendController { // Pastikan 'export' dan nama class sudah benar
  constructor(private readonly userFrontendService: UserFrontendService) {}

  @Get('home')
  @ApiOperation({ summary: 'Mengambil semua data untuk halaman utama' })
  @ApiResponse({ status: 200, description: 'Data homepage berhasil diambil.' })
  getHomepageData() {
    return this.userFrontendService.getHomepageData();
  }
}
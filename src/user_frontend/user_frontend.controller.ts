import { Controller, Get, Query } from '@nestjs/common';
import { UserFrontendService } from './user_frontend.service';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { GetProductsQueryDto } from './dto/get-products-query.dto';
import { HomepageResponseDto } from './dto/homepage-response.dto';

@ApiTags('Frontend - User View')
@Controller('user-frontend')
export class UserFrontendController {
  constructor(private readonly userFrontendService: UserFrontendService) {}

  @Get('home')
  @ApiOperation({ summary: 'Mengambil semua data untuk halaman utama' })
  @ApiResponse({
    status: 200,
    description: 'Data homepage berhasil diambil.',
    type: HomepageResponseDto,
  })
  getHomepageData() {
    return this.userFrontendService.getHomepageData();
  }

  @Get('products')
  @ApiOperation({ summary: 'Mengambil data untuk halaman semua produk (paginasi & filter)' })
  @ApiResponse({ status: 200, description: 'Data produk berhasil diambil.' })
  getAllProducts(@Query() query: GetProductsQueryDto) {
    return this.userFrontendService.getProductsPageData(query);
  }
}
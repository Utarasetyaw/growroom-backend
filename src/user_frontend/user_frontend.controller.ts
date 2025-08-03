import { Body, Controller, Get, Param, ParseIntPipe, Patch, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UserFrontendService } from './user_frontend.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import { GetProductsQueryDto } from './dto/get-products-query.dto';
import { HomepageResponseDto } from './dto/homepage-response.dto';
import { UpdateMyProfileDto } from '../users/dto/update-my-profile.dto';

@ApiTags('Frontend - User View')
@Controller('user-frontend')
export class UserFrontendController {
  constructor(private readonly userFrontendService: UserFrontendService) {}

  // --- Public Endpoints ---

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

  @Get('products/:id')
  @ApiOperation({ summary: 'Mengambil data untuk halaman detail produk' })
  @ApiResponse({ status: 200, description: 'Data detail produk berhasil diambil.' })
  @ApiResponse({ status: 404, description: 'Produk tidak ditemukan.' })
  getProductDetail(@Param('id', ParseIntPipe) id: number) {
    return this.userFrontendService.getProductDetailPageData(id);
  }

  @Get('about')
  @ApiOperation({ summary: 'Mengambil data untuk halaman About' })
  @ApiResponse({ status: 200, description: 'Data halaman About berhasil diambil.' })
  getAboutPage() {
    return this.userFrontendService.getAboutPageData();
  }

  @Get('layout')
  @ApiOperation({ summary: 'Mengambil data untuk layout (Nav & Footer)' })
  @ApiResponse({ status: 200, description: 'Data layout berhasil diambil.' })
  getLayoutData() {
    return this.userFrontendService.getNavAndFooterData();
  }
  
  // --- Private Endpoints (Wajib Login) ---

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mengambil data profil user yang login' })
  @ApiResponse({ status: 200, description: 'Data profil berhasil diambil.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMyProfile(@Req() req: RequestWithUser) {
    return this.userFrontendService.getMyProfile(req.user.userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mengupdate data profil user yang login' })
  @ApiBody({ type: UpdateMyProfileDto })
  @ApiResponse({ status: 200, description: 'Profil berhasil diperbarui.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateMyProfile(@Req() req: RequestWithUser, @Body() dto: UpdateMyProfileDto) {
    return this.userFrontendService.updateMyProfile(req.user.userId, dto);
  }

  @Get('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mengambil semua data untuk halaman checkout' })
  @ApiResponse({ status: 200, description: 'Data checkout berhasil diambil.' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getCheckoutPageData(@Req() req: RequestWithUser) {
    return this.userFrontendService.getCheckoutPageData(req.user.userId);
  }
}
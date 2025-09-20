import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards, ValidationPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiResponse, ApiTags, ApiBadRequestResponse } from '@nestjs/swagger';
import { UserFrontendService } from './user_frontend.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import { GetProductsQueryDto } from './dto/get-products-query.dto';
import { HomepageResponseDto } from './dto/homepage-response.dto';
import { UpdateMyProfileDto } from '../users/dto/update-my-profile.dto';
import {
  AllProductsPageResponseDto,
  CheckoutPageResponseDto,
  LayoutResponseDto,
  ProductDetailPageResponseDto,
} from './dto/page-responses.dto';
import { GeneralSettingResponseDto } from '../generalsetting/dto/general-setting-response.dto';
import { MyProfileResponseDto } from '../users/dto/my-profile-response.dto';
import { UserResponseDto } from '../users/dto/user-response.dto';
import { DiscountsService } from '../discounts/discounts.service';
import { ValidateVoucherDto } from '../discounts/dto/validate-voucher.dto';

@ApiTags('Frontend - User View')
@Controller('user-frontend')
export class UserFrontendController {
  constructor(
    private readonly userFrontendService: UserFrontendService,
    private readonly discountsService: DiscountsService,
  ) {}

  @Get('home')
  @ApiOperation({ summary: 'Mengambil semua data untuk halaman utama' })
  @ApiResponse({ status: 200, description: 'Data homepage berhasil diambil.', type: HomepageResponseDto })
  getHomepageData() {
    return this.userFrontendService.getHomepageData();
  }

  @Get('products')
  @ApiOperation({ summary: 'Mengambil data untuk halaman semua produk (paginasi & filter)' })
  @ApiResponse({ status: 200, description: 'Data produk berhasil diambil.', type: AllProductsPageResponseDto })
  getAllProducts(@Query() query: GetProductsQueryDto) {
    return this.userFrontendService.getProductsPageData(query);
  }

  @Get('products/:id')
  @ApiOperation({ summary: 'Mengambil data untuk halaman detail produk' })
  @ApiResponse({ status: 200, description: 'Data detail produk berhasil diambil.', type: ProductDetailPageResponseDto })
  @ApiResponse({ status: 404, description: 'Produk tidak ditemukan.' })
  getProductDetail(@Param('id', ParseIntPipe) id: number) {
    return this.userFrontendService.getProductDetailPageData(id);
  }

  @Get('about')
  @ApiOperation({ summary: 'Mengambil data untuk halaman About' })
  @ApiResponse({ status: 200, description: 'Data halaman About berhasil diambil.', type: GeneralSettingResponseDto })
  getAboutPage() {
    return this.userFrontendService.getAboutPageData();
  }

  @Get('layout')
  @ApiOperation({ summary: 'Mengambil data untuk layout (Nav & Footer)' })
  @ApiResponse({ status: 200, description: 'Data layout berhasil diambil.', type: LayoutResponseDto })
  getLayoutData() {
    return this.userFrontendService.getNavAndFooterData();
  }
  
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mengambil data profil user yang login' })
  @ApiResponse({ status: 200, description: 'Data profil berhasil diambil.', type: MyProfileResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMyProfile(@Req() req: RequestWithUser) {
    return this.userFrontendService.getMyProfile(req.user.userId);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mengupdate data profil user yang login' })
  @ApiBody({ type: UpdateMyProfileDto })
  @ApiResponse({ status: 200, description: 'Profil berhasil diperbarui.', type: UserResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  updateMyProfile(@Req() req: RequestWithUser, @Body() dto: UpdateMyProfileDto) {
    return this.userFrontendService.updateMyProfile(req.user.userId, dto);
  }

  @Get('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mengambil semua data untuk halaman checkout' })
  @ApiResponse({ status: 200, description: 'Data checkout berhasil diambil.', type: CheckoutPageResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getCheckoutPageData(@Req() req: RequestWithUser) {
    return this.userFrontendService.getCheckoutPageData(req.user.userId);
  }

  @Post('vouchers/validate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Memvalidasi kode voucher di keranjang' })
  @ApiResponse({ status: 200, description: 'Voucher valid dan detail diskon dikembalikan.' })
  @ApiBadRequestResponse({ description: 'Voucher tidak valid (kedaluwarsa, tidak cocok, dll.)' })
  validateVoucher(
    @Req() req: RequestWithUser,
    @Body(ValidationPipe) validateVoucherDto: ValidateVoucherDto,
  ) {
    return this.discountsService.validateVoucher(req.user.userId, validateVoucherDto);
  }
}
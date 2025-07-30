import { Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiNotFoundResponse, ApiForbiddenResponse } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductResponseDto } from './dto/product-response.dto';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Mendapatkan semua produk (Admin/Owner Only)' })
  @ApiResponse({ status: 200, type: [ProductResponseDto] })
  @ApiForbiddenResponse({ description: 'Akses ditolak.' })
  async findAll(@Req() req) {
    if (req.user.role === Role.ADMIN && !req.user.permissions.includes('product')) {
      throw new ForbiddenException('Forbidden');
    }
    return this.service.findAll();
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Mendapatkan detail satu produk (Admin/Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID produk' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  @ApiNotFoundResponse({ description: 'Produk tidak ditemukan.' })
  @ApiForbiddenResponse({ description: 'Akses ditolak.' })
  async findOne(@Req() req, @Param('id', ParseIntPipe) id: number) {
    if (req.user.role === Role.ADMIN && !req.user.permissions.includes('product')) {
      throw new ForbiddenException('Forbidden');
    }
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Membuat produk baru (Admin/Owner Only)' })
  @ApiResponse({ status: 201, type: ProductResponseDto })
  @ApiForbiddenResponse({ description: 'Akses ditolak.' })
  async create(@Req() req, @Body() dto: CreateProductDto) {
    if (req.user.role === Role.ADMIN && !req.user.permissions.includes('product')) {
      throw new ForbiddenException('Forbidden');
    }
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Update produk (Admin/Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID produk' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  @ApiNotFoundResponse({ description: 'Produk tidak ditemukan.' })
  @ApiForbiddenResponse({ description: 'Akses ditolak.' })
  async update(@Req() req, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    if (req.user.role === Role.ADMIN && !req.user.permissions.includes('product')) {
      throw new ForbiddenException('Forbidden');
    }
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Menghapus produk (Admin/Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID produk' })
  @ApiResponse({ status: 200, description: 'Produk berhasil dihapus.' })
  @ApiNotFoundResponse({ description: 'Produk tidak ditemukan.' })
  @ApiForbiddenResponse({ description: 'Akses ditolak.' })
  async remove(@Req() req, @Param('id', ParseIntPipe) id: number) {
    if (req.user.role === Role.ADMIN && !req.user.permissions.includes('product')) {
      throw new ForbiddenException('Forbidden');
    }
    return this.service.remove(id);
  }
}
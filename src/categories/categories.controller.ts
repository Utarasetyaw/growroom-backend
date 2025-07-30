import {
  Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe, UseGuards
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiNotFoundResponse } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';

@ApiTags('Categories') // ✅ Mengelompokkan endpoint
@ApiBearerAuth() // ✅ Menandakan semua endpoint di controller ini butuh Bearer Token
@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  @Get()
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Dapatkan semua kategori (OWNER only)' })
  @ApiResponse({ status: 200, description: 'List semua kategori.', type: [CategoryResponseDto] })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Dapatkan detail satu kategori (OWNER only)' })
  @ApiParam({ name: 'id', description: 'ID dari kategori' })
  @ApiResponse({ status: 200, description: 'Detail kategori.', type: CategoryResponseDto })
  @ApiNotFoundResponse({ description: 'Kategori tidak ditemukan.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Buat kategori baru (OWNER only)' })
  @ApiResponse({ status: 201, description: 'Kategori berhasil dibuat.', type: CategoryResponseDto })
  create(@Body() dto: CreateCategoryDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Update kategori (OWNER only)' })
  @ApiParam({ name: 'id', description: 'ID dari kategori yang akan di-update' })
  @ApiResponse({ status: 200, description: 'Kategori berhasil di-update.', type: CategoryResponseDto })
  @ApiNotFoundResponse({ description: 'Kategori tidak ditemukan.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateCategoryDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Hapus kategori (OWNER only)' })
  @ApiParam({ name: 'id', description: 'ID dari kategori yang akan dihapus' })
  @ApiResponse({ status: 200, description: 'Kategori berhasil dihapus.' })
  @ApiNotFoundResponse({ description: 'Kategori tidak ditemukan.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
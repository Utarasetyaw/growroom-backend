import { Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiNotFoundResponse } from '@nestjs/swagger';
import { SubcategoriesService } from './subcategories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';
import { SubcategoryResponseDto } from './dto/subcategory-response.dto';

@ApiTags('Sub-Categories')
@ApiBearerAuth()
@Controller('subcategories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SubcategoriesController {
  constructor(private readonly service: SubcategoriesService) {}

  @Get()
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Mendapatkan semua sub-kategori (Owner Only)' })
  @ApiResponse({ status: 200, type: [SubcategoryResponseDto] })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Mendapatkan detail satu sub-kategori (Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID dari sub-kategori' })
  @ApiResponse({ status: 200, type: SubcategoryResponseDto })
  @ApiNotFoundResponse({ description: 'Sub-kategori tidak ditemukan.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Membuat sub-kategori baru (Owner Only)' })
  @ApiResponse({ status: 201, type: SubcategoryResponseDto })
  create(@Body() dto: CreateSubcategoryDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Update sub-kategori (Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID dari sub-kategori' })
  @ApiResponse({ status: 200, type: SubcategoryResponseDto })
  @ApiNotFoundResponse({ description: 'Sub-kategori tidak ditemukan.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateSubcategoryDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Menghapus sub-kategori (Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID dari sub-kategori' })
  @ApiResponse({ status: 200, description: 'Berhasil dihapus.' })
  @ApiNotFoundResponse({ description: 'Sub-kategori tidak ditemukan.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
import {
  Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe, UseGuards, Req
} from '@nestjs/common';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly service: ProductsService) {}

  // OWNER & ADMIN (punya permission 'product') bisa akses
  @Get()
  @Roles(Role.OWNER, Role.ADMIN)
  async findAll(@Req() req) {
    // Jika admin, cek permission
    if (req.user.role === Role.ADMIN && !req.user.permissions.includes('product')) {
      throw new Error('Forbidden');
    }
    return this.service.findAll();
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  async findOne(@Req() req, @Param('id', ParseIntPipe) id: number) {
    if (req.user.role === Role.ADMIN && !req.user.permissions.includes('product')) {
      throw new Error('Forbidden');
    }
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.OWNER, Role.ADMIN)
  async create(@Req() req, @Body() dto: CreateProductDto) {
    if (req.user.role === Role.ADMIN && !req.user.permissions.includes('product')) {
      throw new Error('Forbidden');
    }
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  async update(@Req() req, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateProductDto) {
    if (req.user.role === Role.ADMIN && !req.user.permissions.includes('product')) {
      throw new Error('Forbidden');
    }
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  async remove(@Req() req, @Param('id', ParseIntPipe) id: number) {
    if (req.user.role === Role.ADMIN && !req.user.permissions.includes('product')) {
      throw new Error('Forbidden');
    }
    return this.service.remove(id);
  }
}

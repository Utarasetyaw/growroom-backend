// File: src/products/products.controller.ts

import {
  Controller, Get, Post, Patch, Delete, Param, Body,
  ParseIntPipe, UseGuards, UseInterceptors, UploadedFiles, ValidationPipe,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ProductsService } from './products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@ApiTags('Products')
@ApiBearerAuth()
@Controller('products')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN)
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Post()
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('images', 10, {
    storage: diskStorage({
      destination: './uploads/products',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => Math.round(Math.random() * 16).toString(16)).join('');
        cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
  }))
  create(
    @UploadedFiles() files: Array<Express.Multer.File>,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) createProductDto: CreateProductDto,
  ) {
    const imageUrls = files ? files.map(file => `/uploads/products/${file.filename}`) : [];
    return this.productsService.create(createProductDto, imageUrls);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('newImages', 10, {
    storage: diskStorage({
      destination: './uploads/products',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => Math.round(Math.random() * 16).toString(16)).join('');
        cb(null, `${randomName}${extname(file.originalname)}`);
      },
    }),
  }))
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ transform: true, whitelist: true })) updateProductDto: UpdateProductDto,
    @UploadedFiles() files?: Array<Express.Multer.File>,
  ) {
    const newImageUrls = files ? files.map(file => `/uploads/products/${file.filename}`) : [];
    return this.productsService.update(id, updateProductDto, newImageUrls);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }
}
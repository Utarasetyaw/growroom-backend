import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiConsumes,
  ApiNotFoundResponse,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
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
  @ApiOperation({ summary: 'Membuat produk baru (Admin/Owner Only)' })
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
    @Body() createProductDto: CreateProductDto,
  ) {
    const imageUrls = files ? files.map(file => `/uploads/products/${file.filename}`) : [];
    
    try {
      // Buat objek baru untuk menampung data yang sudah bersih dan dikonversi
      const cleanedDto: any = {};

      // Konversi semua field dari string ke tipe data yang benar
      cleanedDto.name = JSON.parse(createProductDto.name);
      cleanedDto.variant = JSON.parse(createProductDto.variant);
      cleanedDto.description = createProductDto.description ? JSON.parse(createProductDto.description) : undefined;
      cleanedDto.careDetails = JSON.parse(createProductDto.careDetails);
      cleanedDto.prices = JSON.parse(createProductDto.prices);
      cleanedDto.stock = parseInt(createProductDto.stock as any, 10);
      cleanedDto.subCategoryId = parseInt(createProductDto.subCategoryId as any, 10);
      cleanedDto.weight = createProductDto.weight ? parseFloat(createProductDto.weight as any) : null;
      cleanedDto.isActive = String(createProductDto.isActive).toLowerCase() === 'true';
      cleanedDto.isBestProduct = String(createProductDto.isBestProduct).toLowerCase() === 'true';

      return this.productsService.create(cleanedDto, imageUrls);
    } catch (error) {
      console.error('Error parsing create DTO:', error);
      throw new BadRequestException('Format data tidak valid. Pastikan semua field terisi dengan benar.');
    }
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Update produk (Admin/Owner Only)' })
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
    @Body() updateProductDto: UpdateProductDto,
    @UploadedFiles() files?: Array<Express.Multer.File>,
  ) {
    const newImageUrls = files ? files.map(file => `/uploads/products/${file.filename}`) : [];

    try {
      // Buat objek baru untuk menampung data yang sudah bersih dan dikonversi
      const cleanedDto: any = { ...updateProductDto };

      // Konversi semua field yang dikirim dari string ke tipe data yang benar
      // Kita cek keberadaan setiap field karena ini adalah operasi PATCH (parsial)
      if (cleanedDto.name) cleanedDto.name = JSON.parse(cleanedDto.name as string);
      if (cleanedDto.variant) cleanedDto.variant = JSON.parse(cleanedDto.variant as string);
      if (cleanedDto.description) cleanedDto.description = JSON.parse(cleanedDto.description as string);
      if (cleanedDto.careDetails) cleanedDto.careDetails = JSON.parse(cleanedDto.careDetails as string);
      if (cleanedDto.prices) cleanedDto.prices = JSON.parse(cleanedDto.prices as string);
      if (cleanedDto.stock) cleanedDto.stock = parseInt(cleanedDto.stock as any, 10);
      if (cleanedDto.subCategoryId) cleanedDto.subCategoryId = parseInt(cleanedDto.subCategoryId as any, 10);
      if (cleanedDto.weight) cleanedDto.weight = parseFloat(cleanedDto.weight as any);
      if (cleanedDto.isActive !== undefined) cleanedDto.isActive = String(cleanedDto.isActive).toLowerCase() === 'true';
      if (cleanedDto.isBestProduct !== undefined) cleanedDto.isBestProduct = String(cleanedDto.isBestProduct).toLowerCase() === 'true';
      
      return this.productsService.update(id, cleanedDto, newImageUrls);
    } catch (error) {
      console.error('Error parsing update DTO:', error);
      throw new BadRequestException('Format data tidak valid pada salah satu field yang diupdate.');
    }
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }
}
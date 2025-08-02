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
  NotFoundException,
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

// REVISI: Mengimpor DTO dari file terpisah
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
  @ApiOperation({ summary: 'Mendapatkan semua produk (Admin/Owner Only)' })
  @ApiResponse({ status: 200, type: [ProductResponseDto] })
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Mendapatkan detail satu produk (Admin/Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID Produk' })
  @ApiResponse({ status: 200, type: ProductResponseDto })
  @ApiNotFoundResponse({ description: 'Produk tidak ditemukan.' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const product = await this.productsService.findOne(id);
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found.`);
    }
    return product;
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
    // REVISI: Ambil URL dari file yang di-upload dan teruskan ke service.
    // DTO akan di-parsing secara otomatis oleh `class-validator` & `class-transformer`.
    const imageUrls = files ? files.map(file => `/uploads/products/${file.filename}`) : [];
    return this.productsService.create(createProductDto, imageUrls);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Update produk (Admin/Owner Only)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('newImages', 10, { // REVISI: Nama field yang jelas untuk gambar baru
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
    @UploadedFiles() files?: Array<Express.Multer.File>, // REVISI: Dibuat opsional
  ) {
    // REVISI: Kirim URL gambar baru dan DTO yang mungkin berisi `imagesToDelete`.
    const newImageUrls = files ? files.map(file => `/uploads/products/${file.filename}`) : [];
    return this.productsService.update(id, updateProductDto, newImageUrls);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Menghapus produk (Admin/Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID Produk' })
  @ApiResponse({ status: 200, description: 'Produk berhasil dihapus.' })
  @ApiNotFoundResponse({ description: 'Produk tidak ditemukan.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }
}
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
  @ApiOperation({ summary: 'List semua produk (Admin/Owner Only)' })
  @ApiResponse({ status: 200, description: 'List produk berhasil diambil.', type: [ProductResponseDto] })
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Lihat detail satu produk (Admin/Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID unik dari produk', example: 1 })
  @ApiResponse({ status: 200, description: 'Detail produk berhasil diambil.', type: ProductResponseDto })
  @ApiNotFoundResponse({ description: 'Produk dengan ID tersebut tidak ditemukan.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }

  @Post()
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Membuat produk baru (Admin/Owner Only)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Produk berhasil dibuat.', type: ProductResponseDto })
  @ApiResponse({ status: 400, description: 'Format data tidak valid.' })
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
    @Body() rawDto: CreateProductDto,
  ) {
    const jsonFields = ['name', 'variant', 'description', 'prices', 'careDetails'];
    const processedDto: any = { ...rawDto };

    jsonFields.forEach(field => {
      if (processedDto[field] && typeof processedDto[field] === 'string') {
        try {
          processedDto[field] = JSON.parse(processedDto[field]);
        } catch (e) {
          throw new BadRequestException(`Format JSON tidak valid pada field: ${field}`);
        }
      }
    });
    
    const imageUrls = files ? files.map(file => `/uploads/products/${file.filename}`) : [];
    return this.productsService.create(processedDto, imageUrls);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Update produk (Admin/Owner Only)' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'ID dari produk yang akan di-update', example: 1 })
  @ApiResponse({ status: 200, description: 'Produk berhasil diupdate.', type: ProductResponseDto })
  @ApiNotFoundResponse({ description: 'Produk dengan ID tersebut tidak ditemukan.' })
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
    @Body() rawDto: UpdateProductDto,
    @UploadedFiles() files?: Array<Express.Multer.File>,
  ) {
    const jsonFields = ['name', 'variant', 'description', 'prices', 'careDetails'];
    const processedDto: any = { ...rawDto };

    jsonFields.forEach(field => {
      if (processedDto[field] && typeof processedDto[field] === 'string') {
        try {
          processedDto[field] = JSON.parse(processedDto[field]);
        } catch (e) {
          throw new BadRequestException(`Format JSON tidak valid pada field: ${field}`);
        }
      }
    });

    const newImageUrls = files ? files.map(file => `/uploads/products/${file.filename}`) : [];
    return this.productsService.update(id, processedDto, newImageUrls);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Hapus produk (Admin/Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID dari produk yang akan dihapus', example: 1 })
  @ApiResponse({ status: 200, description: 'Produk berhasil dihapus.' })
  @ApiNotFoundResponse({ description: 'Produk dengan ID tersebut tidak ditemukan.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }
}
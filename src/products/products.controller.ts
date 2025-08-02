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

// Definisikan tipe data yang diharapkan service agar lebih aman
interface ParsedPrice { currencyId: number; price: number; }
interface ParsedCareDetail { name: Record<string, string>; value: Record<string, string>; }

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
    @Body() rawDto: CreateProductDto,
  ) {
    let parsedPrices: ParsedPrice[] | undefined = undefined;
    if (rawDto.prices) {
      try {
        parsedPrices = JSON.parse(rawDto.prices);
      } catch (e) {
        throw new BadRequestException('Format "prices" tidak valid. Harus berupa JSON string dari sebuah array.');
      }
    }

    let parsedCareDetails: ParsedCareDetail[] | undefined = undefined;
    if (rawDto.careDetails) {
      try {
        parsedCareDetails = JSON.parse(rawDto.careDetails);
      } catch (e) {
        throw new BadRequestException('Format "careDetails" tidak valid. Harus berupa JSON string dari sebuah array.');
      }
    }

    const processedDto = {
      ...rawDto,
      prices: parsedPrices,
      careDetails: parsedCareDetails,
    };
    
    const imageUrls = files ? files.map(file => `/uploads/products/${file.filename}`) : [];
    
    return this.productsService.create(processedDto as any, imageUrls);
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
    @Body() rawDto: UpdateProductDto,
    @UploadedFiles() files?: Array<Express.Multer.File>,
  ) {
    const processedDto: any = { ...rawDto };

    if (processedDto.prices && typeof processedDto.prices === 'string') {
        try { processedDto.prices = JSON.parse(processedDto.prices); }
        catch (e) { throw new BadRequestException('Format "prices" tidak valid.'); }
    }
    if (processedDto.careDetails && typeof processedDto.careDetails === 'string') {
        try { processedDto.careDetails = JSON.parse(processedDto.careDetails); }
        catch (e) { throw new BadRequestException('Format "careDetails" tidak valid.'); }
    }
    if (processedDto.imagesToDelete && typeof processedDto.imagesToDelete === 'string') {
        try { 
          const parsed = JSON.parse(processedDto.imagesToDelete);
          // Frontend mungkin mengirim string "1,2,3" yang tidak di-parse sebagai JSON array
          if(typeof parsed === 'string') {
             processedDto.imagesToDelete = parsed.split(',').map(Number);
          } else {
             processedDto.imagesToDelete = parsed;
          }
        }
        catch (e) { 
            // Fallback jika dikirim sebagai string biasa "1,2,3"
            processedDto.imagesToDelete = processedDto.imagesToDelete.split(',').map(Number);
        }
    }

    const newImageUrls = files ? files.map(file => `/uploads/products/${file.filename}`) : [];
    return this.productsService.update(id, processedDto, newImageUrls);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }
}
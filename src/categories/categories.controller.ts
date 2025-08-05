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
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { diskStorage } from 'multer'; // [BARU] Impor langsung
import { extname } from 'path'; // [BARU] Impor langsung
import { CategoriesService } from './categories.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CategoryResponseDto } from './dto/category-response.dto';

@ApiTags('Categories')
@ApiBearerAuth()
@Controller('categories')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CategoriesController {
  constructor(private readonly service: CategoriesService) {}

  // Metode findAll() dan findOne() tidak berubah...
  @Get()
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Dapatkan semua kategori (OWNER only)' })
  @ApiResponse({
    status: 200,
    description: 'List semua kategori.',
    type: [CategoryResponseDto],
  })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Dapatkan detail satu kategori (OWNER only)' })
  @ApiParam({ name: 'id', description: 'ID dari kategori' })
  @ApiResponse({
    status: 200,
    description: 'Detail kategori.',
    type: CategoryResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Kategori tidak ditemukan.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Buat kategori baru (OWNER only)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/categories',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  @ApiResponse({
    status: 201,
    description: 'Kategori berhasil dibuat.',
    type: CategoryResponseDto,
  })
  create(
    @Body() dto: CreateCategoryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const imageUrl = file ? `/uploads/categories/${file.filename}` : undefined;
    return this.service.create(dto, imageUrl);
  }

  @Patch(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Update kategori (OWNER only)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/categories',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  @ApiParam({ name: 'id', description: 'ID dari kategori yang akan di-update' })
  @ApiResponse({
    status: 200,
    description: 'Kategori berhasil di-update.',
    type: CategoryResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Kategori tidak ditemukan.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const newImageUrl = file ? `/uploads/categories/${file.filename}` : undefined;
    const deleteImageFlag = dto.deleteImage === 'true';

    if (newImageUrl && deleteImageFlag) {
      throw new BadRequestException(
        'Cannot upload a new image and delete the existing one at the same time.',
      );
    }

    return this.service.update(id, dto, newImageUrl, deleteImageFlag);
  }

  // Metode remove() tidak berubah...
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
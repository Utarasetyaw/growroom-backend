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
import { diskStorage } from 'multer';
import { extname } from 'path';
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

  @Get()
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Dapatkan semua kategori (OWNER only)' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Dapatkan detail satu kategori (OWNER only)' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  // --- [PERBAIKAN] Metode Create ---
  @Post()
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Buat kategori baru (Owner Only)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/categories',
        filename: (req, file, cb) => {
          const randomName = Array(32).fill(null).map(() => Math.round(Math.random() * 16).toString(16)).join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  create(
    @Body() body: CreateCategoryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let parsedName: Record<string, string>;
    try {
      // Mengubah `body.name` dari string JSON menjadi objek
      parsedName = JSON.parse(body.name as any);
    } catch (e) {
      throw new BadRequestException('Format "name" tidak valid. Harus berupa JSON string.');
    }

    const dto = { name: parsedName };
    const imageUrl = file ? `/uploads/categories/${file.filename}` : undefined;
    
    return this.service.create(dto, imageUrl);
  }

  // --- [PERBAIKAN] Metode Update ---
  @Patch(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Update kategori (OWNER only)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/categories',
        filename: (req, file, cb) => {
          const randomName = Array(32).fill(null).map(() => Math.round(Math.random() * 16).toString(16)).join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateCategoryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const dataToUpdate: any = {};
    
    // Mengubah `body.name` dari string JSON menjadi objek jika ada
    if (body.name) {
      try {
        dataToUpdate.name = JSON.parse(body.name as any);
      } catch (e) {
        throw new BadRequestException('Format "name" tidak valid. Harus berupa JSON string.');
      }
    }

    const newImageUrl = file ? `/uploads/categories/${file.filename}` : undefined;
    const deleteImageFlag = body.deleteImage === 'true';

    if (newImageUrl && deleteImageFlag) {
      throw new BadRequestException(
        'Cannot upload a new image and delete the existing one at the same time.',
      );
    }

    return this.service.update(id, dataToUpdate, newImageUrl, deleteImageFlag);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Hapus kategori (OWNER only)' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
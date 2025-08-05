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

  // Metode findAll() dan findOne() tidak berubah...
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
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/subcategories',
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
  @ApiResponse({ status: 201, type: SubcategoryResponseDto })
  create(
    @Body() dto: CreateSubcategoryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const imageUrl = file ? `/uploads/subcategories/${file.filename}` : undefined;
    return this.service.create(dto, imageUrl);
  }

  @Patch(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Update sub-kategori (Owner Only)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/subcategories',
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
  @ApiParam({ name: 'id', description: 'ID dari sub-kategori' })
  @ApiResponse({ status: 200, type: SubcategoryResponseDto })
  @ApiNotFoundResponse({ description: 'Sub-kategori tidak ditemukan.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateSubcategoryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const newImageUrl = file
      ? `/uploads/subcategories/${file.filename}`
      : undefined;
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
  @ApiOperation({ summary: 'Menghapus sub-kategori (Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID dari sub-kategori' })
  @ApiResponse({ status: 200, description: 'Berhasil dihapus.' })
  @ApiNotFoundResponse({ description: 'Sub-kategori tidak ditemukan.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
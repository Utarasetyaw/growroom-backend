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

  @Get()
  @Roles(Role.OWNER)
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles(Role.OWNER)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  // --- [PERBAIKAN] Metode Create ---
  @Post()
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Membuat sub-kategori baru (Owner Only)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/subcategories',
        filename: (req, file, cb) => {
          const randomName = Array(32).fill(null).map(() => Math.round(Math.random() * 16).toString(16)).join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  create(
    @Body() body: CreateSubcategoryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let parsedName: Record<string, string>;
    try {
      // Mengubah `body.name` dari string JSON menjadi objek
      parsedName = JSON.parse(body.name as any);
    } catch (e) {
      throw new BadRequestException('Format "name" tidak valid. Harus berupa JSON string.');
    }

    // Mengubah `body.categoryId` dari string menjadi number
    const categoryId = parseInt(body.categoryId as any, 10);
    if (isNaN(categoryId)) {
      throw new BadRequestException('categoryId harus berupa angka.');
    }

    const dto = { name: parsedName, categoryId };
    const imageUrl = file ? `/uploads/subcategories/${file.filename}` : undefined;

    return this.service.create(dto, imageUrl);
  }

  // --- [PERBAIKAN] Metode Update ---
  @Patch(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Update sub-kategori (Owner Only)' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/subcategories',
        filename: (req, file, cb) => {
          const randomName = Array(32).fill(null).map(() => Math.round(Math.random() * 16).toString(16)).join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateSubcategoryDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const dataToUpdate: any = {};

    if (body.name) {
      try {
        dataToUpdate.name = JSON.parse(body.name as any);
      } catch (e) {
        throw new BadRequestException('Format "name" tidak valid. Harus berupa JSON string.');
      }
    }
    
    if (body.categoryId) {
      const categoryId = parseInt(body.categoryId as any, 10);
      if (isNaN(categoryId)) {
        throw new BadRequestException('categoryId harus berupa angka.');
      }
      dataToUpdate.categoryId = categoryId;
    }

    const newImageUrl = file ? `/uploads/subcategories/${file.filename}` : undefined;
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
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
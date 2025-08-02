import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, ParseIntPipe, UseInterceptors, UploadedFile, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiConsumes, ApiBody, ApiNotFoundResponse } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { TestimonialsService } from './testimonials.service';
import { CreateTestimonialDto } from './dto/create-testimonial.dto';
import { UpdateTestimonialDto } from './dto/update-testimonial.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { extname } from 'path';
import { Role } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { TestimonialResponseDto } from './dto/testimonial-response.dto';

@ApiTags('Testimonials')
@Controller('testimonials')
@UseGuards(JwtAuthGuard, RolesGuard) // Lindungi semua rute di controller ini
export class TestimonialsController {
  constructor(private readonly testimonialsService: TestimonialsService) {}

  @Post()
  @Roles(Role.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Membuat testimoni baru (Owner Only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: { type: 'string', format: 'binary' },
        author: { type: 'string' },
        quote: { type: 'string', description: 'JSON string, e.g., \'{"en":"Good!","id":"Bagus!"}\'' },
        rating: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 201, type: TestimonialResponseDto })
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: './uploads/testimonials',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => Math.round(Math.random() * 16).toString(16)).join('');
        cb(null, `${randomName}${extname(file.originalname)}`);
      }
    })
  }))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    if (!file) throw new BadRequestException('Image file is required.');
    
    const imageUrl = `/uploads/testimonials/${file.filename}`;
    return this.testimonialsService.create(body, imageUrl);
  }

  @Get()
  @Roles(Role.OWNER, Role.ADMIN) // Admin juga bisa melihat
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mendapatkan semua testimoni' })
  @ApiResponse({ status: 200, type: [TestimonialResponseDto] })
  async findAll() {
    return this.testimonialsService.findAll();
  }

  @Patch(':id')
  @Roles(Role.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update testimoni (Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID testimoni' })
  @ApiConsumes('multipart/form-data') // ✅ Terima multipart/form-data
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        image: { type: 'string', format: 'binary', description: 'File gambar baru (opsional).' },
        author: { type: 'string' },
        quote: { type: 'string', description: 'JSON string, e.g., \'{"en":"Good!","id":"Bagus!"}\'' },
        rating: { type: 'number' },
      },
    },
  })
  @ApiResponse({ status: 200, type: TestimonialResponseDto })
  @ApiNotFoundResponse({ description: 'Testimoni tidak ditemukan.' })
  @UseInterceptors(FileInterceptor('image', { // ✅ Gunakan interceptor untuk file
    storage: diskStorage({
      destination: './uploads/testimonials',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => Math.round(Math.random() * 16).toString(16)).join('');
        cb(null, `${randomName}${extname(file.originalname)}`);
      }
    })
  }))
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File, // File bersifat opsional
  ) {
    const imageUrl = file ? `/uploads/testimonials/${file.filename}` : undefined;
    return this.testimonialsService.update(id, body, imageUrl);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Menghapus testimoni (Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID testimoni' })
  @ApiResponse({ status: 200, description: 'Berhasil dihapus.' })
  @ApiNotFoundResponse({ description: 'Testimoni tidak ditemukan.' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.testimonialsService.remove(id);
  }
}

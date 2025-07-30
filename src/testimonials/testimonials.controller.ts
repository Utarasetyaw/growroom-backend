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
export class TestimonialsController {
  constructor(private readonly testimonialsService: TestimonialsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Membuat testimoni baru (Owner Only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Data testimoni. Field "image" adalah file, field lain adalah teks.',
    // Kita gunakan DTO dari create, lalu tambahkan properti 'image' secara manual untuk dokumentasi
    schema: {
      type: 'object',
      properties: {
        image: { type: 'string', format: 'binary', description: 'File gambar testimoni.' },
        author: { type: 'string', example: 'Budi' },
        quote: { type: 'string', example: '{"id":"Sangat puas!","en":"Very satisfied!"}' },
        rating: { type: 'number', example: 5 },
      },
    },
  })
  @ApiResponse({ status: 201, type: TestimonialResponseDto })
  @UseInterceptors(FileInterceptor('image', { /*... multer config ...*/ }))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    if (typeof body.quote === 'string') {
      try { body.quote = JSON.parse(body.quote); } catch {}
    }
    const imageUrl = file ? `/uploads/testimonials/${file.filename}` : null;
    const dto = plainToInstance(CreateTestimonialDto, body);
    const errors = validateSync(dto);
    if (errors.length) {
      throw new BadRequestException(errors.flatMap(e => e.constraints ? Object.values(e.constraints) : []));
    }
    return this.testimonialsService.create(dto, imageUrl);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mendapatkan semua testimoni (Owner Only)' })
  @ApiResponse({ status: 200, type: [TestimonialResponseDto] })
  async findAll() {
    return this.testimonialsService.findAll();
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update testimoni (Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID testimoni' })
  @ApiResponse({ status: 200, type: TestimonialResponseDto })
  @ApiNotFoundResponse({ description: 'Testimoni tidak ditemukan.' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTestimonialDto: UpdateTestimonialDto,
  ) {
    if (typeof updateTestimonialDto.quote === 'string') {
      try { updateTestimonialDto.quote = JSON.parse(updateTestimonialDto.quote); } catch {}
    }
    return this.testimonialsService.update(id, updateTestimonialDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
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
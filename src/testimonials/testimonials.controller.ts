import {
  Controller, Get, Post, Body, Patch, Param, Delete,
  UseGuards, ParseIntPipe, UseInterceptors, UploadedFile,
  BadRequestException,
} from '@nestjs/common';
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

@Controller('testimonials')
export class TestimonialsController {
  constructor(private readonly testimonialsService: TestimonialsService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @UseInterceptors(FileInterceptor('image', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        console.log('=== [DISK STORAGE] Create destination folder ./uploads/testimonials');
        cb(null, './uploads/testimonials');
      },
      filename: (req, file, cb) => {
        const randomName = Array(32)
          .fill(null)
          .map(() => (Math.round(Math.random() * 16)).toString(16))
          .join('');
        const ext = extname(file.originalname);
        const finalName = `${randomName}${ext}`;
        console.log('=== [DISK STORAGE] Generated filename:', finalName);
        cb(null, finalName);
      },
    }),
    fileFilter: (req, file, cb) => {
      console.log('=== [FILE FILTER] Multer file received:', file?.originalname, file?.mimetype);
      cb(null, true);
    },
    limits: {
      fileSize: 1024 * 1024 * 2, // 2MB
    },
  }))
  async create(
    @UploadedFile() file: Express.Multer.File,
    @Body() body: any,
  ) {
    console.log('=== [CREATE TESTIMONIAL] Raw @Body:', body);
    console.log('=== [CREATE TESTIMONIAL] Uploaded file:', file);

    const imageUrl = file ? `/uploads/testimonials/${file.filename}` : null;
    console.log('=== [CREATE TESTIMONIAL] imageUrl:', imageUrl);

    const dto = plainToInstance(CreateTestimonialDto, body);
    console.log('=== [CREATE TESTIMONIAL] DTO after transform:', dto);

    const errors = validateSync(dto);
    if (errors.length) {
      const errorMessages = errors.flatMap(e =>
        e.constraints ? Object.values(e.constraints) : []
      );
      console.log('=== [CREATE TESTIMONIAL] DTO validation error:', errorMessages);
      throw new BadRequestException(errorMessages);
    }

    try {
      const result = await this.testimonialsService.create(dto, imageUrl);
      console.log('=== [CREATE TESTIMONIAL] Created result:', result);
      return result;
    } catch (e) {
      console.error('!!! [CREATE TESTIMONIAL] ERROR:', e);
      throw e;
    }
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  async findAll() {
    console.log('=== [GET TESTIMONIALS] Called');
    const result = await this.testimonialsService.findAll();
    console.log('=== [GET TESTIMONIALS] Result:', result);
    return result;
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateTestimonialDto: UpdateTestimonialDto,
  ) {
    console.log('=== [UPDATE TESTIMONIAL] ID:', id, 'DTO:', updateTestimonialDto);
    const result = await this.testimonialsService.update(id, updateTestimonialDto);
    console.log('=== [UPDATE TESTIMONIAL] Result:', result);
    return result;
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  async remove(@Param('id', ParseIntPipe) id: number) {
    console.log('=== [DELETE TESTIMONIAL] ID:', id);
    const result = await this.testimonialsService.remove(id);
    console.log('=== [DELETE TESTIMONIAL] Result:', result);
    return result;
  }
}

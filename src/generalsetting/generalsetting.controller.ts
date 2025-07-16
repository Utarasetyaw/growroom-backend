// src/generalsetting/generalsetting.controller.ts
import {
  Controller, Get, Patch, Body, UseGuards,
  UseInterceptors, UploadedFiles, BadRequestException,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { GeneralsettingService } from './generalsetting.service';
import { extname } from 'path';

@Controller('generalsetting')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GeneralsettingController {
  constructor(private readonly service: GeneralsettingService) {}

  @Get()
  @Roles(Role.OWNER)
  find() {
    return this.service.find();
  }

  @Patch()
  @Roles(Role.OWNER)
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'logoUrl', maxCount: 1 },
    { name: 'faviconUrl', maxCount: 1 },
    { name: 'bannerImageUrl', maxCount: 1 },
    { name: 'bannerVideoUrl', maxCount: 1 }
  ], {
    storage: diskStorage({
      destination: './uploads/generalsetting',
      filename: (req, file, cb) => {
        const randomName = Array(32)
          .fill(null)
          .map(() => Math.round(Math.random() * 16).toString(16))
          .join('');
        cb(null, `${randomName}${extname(file.originalname)}`);
      }
    }),
    fileFilter: (req, file, cb) => cb(null, true),
    limits: { fileSize: 1024 * 1024 * 2 }
  }))
  async patchGeneral(
    @UploadedFiles() files: { [fieldname: string]: Express.Multer.File[] },
    @Body() body: any
  ) {
    // Ambil path file jika ada upload
    const fileMap: any = {};
    if (files.logoUrl) fileMap.logoUrl = `/uploads/generalsetting/${files.logoUrl[0].filename}`;
    if (files.faviconUrl) fileMap.faviconUrl = `/uploads/generalsetting/${files.faviconUrl[0].filename}`;
    if (files.bannerImageUrl) fileMap.bannerImageUrl = `/uploads/generalsetting/${files.bannerImageUrl[0].filename}`;
    if (files.bannerVideoUrl) fileMap.bannerVideoUrl = `/uploads/generalsetting/${files.bannerVideoUrl[0].filename}`;

    // Merge body + file
    const data = { ...body, ...fileMap };

    // Parse JSON string untuk multilang fields jika dikirim string dari Postman
    ['shopName', 'shopDescription', 'socialMedia'].forEach(field => {
      if (typeof data[field] === 'string') {
        try { data[field] = JSON.parse(data[field]); }
        catch { throw new BadRequestException(`Invalid JSON at ${field}`); }
      }
    });

    return this.service.update(data);
  }
}

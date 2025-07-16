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
    // Handle uploaded files (logo, favicon, banner, etc)
    const fileMap: any = {};
    if (files.logoUrl) fileMap.logoUrl = `/uploads/generalsetting/${files.logoUrl[0].filename}`;
    if (files.faviconUrl) fileMap.faviconUrl = `/uploads/generalsetting/${files.faviconUrl[0].filename}`;
    if (files.bannerImageUrl) fileMap.bannerImageUrl = `/uploads/generalsetting/${files.bannerImageUrl[0].filename}`;
    if (files.bannerVideoUrl) fileMap.bannerVideoUrl = `/uploads/generalsetting/${files.bannerVideoUrl[0].filename}`;

    // Gabung body + files
    const data = { ...body, ...fileMap };

    // JSON parse untuk multilang/complex fields jika dikirim string dari Postman
    ['shopName', 'shopDescription', 'socialMedia'].forEach(field => {
      if (typeof data[field] === 'string') {
        try { data[field] = JSON.parse(data[field]); }
        catch { throw new BadRequestException(`Invalid JSON at ${field}`); }
      }
    });

    // Optional: Validasi telegramBotToken/telegramChatId (string saja)
    if ('telegramBotToken' in data && typeof data.telegramBotToken !== 'string')
      throw new BadRequestException('telegramBotToken must be a string');
    if ('telegramChatId' in data && typeof data.telegramChatId !== 'string')
      throw new BadRequestException('telegramChatId must be a string');

    // Call service update (akan update seluruh field yang dikirim)
    return this.service.update(data);
  }
}

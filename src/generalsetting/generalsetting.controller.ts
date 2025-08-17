import {
  Controller, Get, Patch, Body, UseGuards,
  UseInterceptors, UploadedFiles, BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { GeneralsettingService } from './generalsetting.service';
import { extname } from 'path';
import { UpdateGeneralsettingDto } from './dto/update-generalsetting.dto';
import { GeneralSettingResponseDto } from './dto/general-setting-response.dto';
import { UpdateShippingModeDto } from './dto/update-shipping-mode.dto';
// 1. Impor decorator @Public
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('General Settings')
// 2. Ubah path controller agar konsisten dengan panggilan frontend
@Controller('generalsettings')
export class GeneralsettingController {
  constructor(private readonly service: GeneralsettingService) {}
  
 
  // Endpoint di bawah ini tidak perlu diubah, hanya guard-nya saja
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mendapatkan semua pengaturan umum (Owner Only)' })
  @ApiResponse({ status: 200, type: GeneralSettingResponseDto })
  find() {
    return this.service.findOne();
  }

  @Patch()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update pengaturan umum (termasuk upload file) (Owner Only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Data pengaturan yang akan diupdate. Field kompleks seperti shopName, faqs, dll, harus dalam format JSON string.',
    type: UpdateGeneralsettingDto,
  })
  @ApiResponse({ status: 200, description: 'Pengaturan berhasil diupdate.', type: GeneralSettingResponseDto })
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'logoUrl', maxCount: 1 },
    { name: 'faviconUrl', maxCount: 1 },
    { name: 'bannerImageUrl', maxCount: 1 },
    { name: 'bannerVideoUrl', maxCount: 1 }
  ], {
    storage: diskStorage({
      destination: './uploads/generalsetting',
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => Math.round(Math.random() * 16).toString(16)).join('');
        cb(null, `${randomName}${extname(file.originalname)}`);
      }
    }),
  }))
  async patchGeneral(
    @UploadedFiles() files: { [fieldname: string]: Express.Multer.File[] },
    @Body() body: any,
  ) {
    const fileMap: any = {};
    if (files.logoUrl) fileMap.logoUrl = `/uploads/generalsetting/${files.logoUrl[0].filename}`;
    if (files.faviconUrl) fileMap.faviconUrl = `/uploads/generalsetting/${files.faviconUrl[0].filename}`;
    if (files.bannerImageUrl) fileMap.bannerImageUrl = `/uploads/generalsetting/${files.bannerImageUrl[0].filename}`;
    if (files.bannerVideoUrl) fileMap.bannerVideoUrl = `/uploads/generalsetting/${files.bannerVideoUrl[0].filename}`;

    const data = { ...body, ...fileMap };

    ['shopName', 'shopDescription', 'socialMedia', 'aboutItems', 'faqs'].forEach(field => {
      if (typeof data[field] === 'string') {
        try { 
          data[field] = JSON.parse(data[field]); 
        } catch { 
          throw new BadRequestException(`Format JSON tidak valid pada field: ${field}`); 
        }
      }
    });

    return this.service.update(data);
  }

  @Patch('shippingmode')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update mode kalkulasi pengiriman (Owner Only)' })
  @ApiBody({ type: UpdateShippingModeDto })
  updateShippingMode(@Body() dto: UpdateShippingModeDto) {
    return this.service.updateShippingMode(dto);
  }
}
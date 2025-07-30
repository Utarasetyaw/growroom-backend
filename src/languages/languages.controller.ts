import { Controller, Get, Patch, Param, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiNotFoundResponse, ApiBody } from '@nestjs/swagger';
import { LanguagesService } from './languages.service';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { LanguageResponseDto } from './dto/language-response.dto';

@ApiTags('Languages')
@ApiBearerAuth()
@Controller('languages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LanguagesController {
  constructor(private readonly languagesService: LanguagesService) {}

  @Get()
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Mendapatkan semua bahasa (Owner Only)' })
  @ApiResponse({ status: 200, description: 'List semua bahasa.', type: [LanguageResponseDto] })
  findAll() {
    return this.languagesService.findAll();
  }

  @Patch(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Update status bahasa (Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID dari bahasa' })
  @ApiBody({ type: UpdateLanguageDto })
  @ApiResponse({ status: 200, description: 'Bahasa berhasil di-update.', type: LanguageResponseDto })
  @ApiNotFoundResponse({ description: 'Bahasa tidak ditemukan.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLanguageDto,
  ) {
    return this.languagesService.update(id, dto);
  }
}
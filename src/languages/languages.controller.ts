// src/languages/languages.controller.ts
import {
  Controller, Get, Patch, Param, Body, UseGuards, ParseIntPipe
} from '@nestjs/common';
import { LanguagesService } from './languages.service';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('languages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LanguagesController {
  constructor(private readonly languagesService: LanguagesService) {}

  @Get()
  @Roles(Role.OWNER)
  findAll() {
    return this.languagesService.findAll();
  }

  @Patch(':id')
  @Roles(Role.OWNER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateLanguageDto,
  ) {
    return this.languagesService.update(id, dto);
  }
}

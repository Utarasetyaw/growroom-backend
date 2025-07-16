import {
  Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe, UseGuards, Query
} from '@nestjs/common';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('conversations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConversationsController {
  constructor(private readonly service: ConversationsService) {}

  // Semua (Owner/Admin/User) bisa create (userId harus valid)
  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.USER)
  create(@Body() dto: CreateConversationDto) {
    return this.service.create(dto);
  }

  // Owner & Admin bisa lihat semua; user sebaiknya filter via query atau endpoint khusus (optional improvement)
  @Get()
  @Roles(Role.OWNER, Role.ADMIN)
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.USER)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateConversationDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}

import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, ParseIntPipe
} from '@nestjs/common';
import { ChatMessagesService } from './chat-messages.service';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { UpdateChatMessageDto } from './dto/update-chat-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('chat-messages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChatMessagesController {
  constructor(private readonly service: ChatMessagesService) {}

  // List semua message dalam 1 conversation (untuk chat room)
  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.USER)
  async findAll(@Query('conversationId') conversationId?: number) {
    return this.service.findAll(conversationId ? +conversationId : undefined);
  }

  // Lihat 1 message (rare)
  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.USER)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  // Create message (via REST, biasanya lebih sering via websocket)
  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.USER)
  async create(@Body() dto: CreateChatMessageDto) {
    return this.service.create(dto);
  }

  // Edit pesan (jarang dipakai, mostly debugging/admin only)
  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateChatMessageDto) {
    return this.service.update(id, dto);
  }

  // Hapus pesan (jarang, mostly admin)
  @Delete(':id')
  @Roles(Role.OWNER)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}

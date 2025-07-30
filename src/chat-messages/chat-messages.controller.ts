import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiQuery, ApiNotFoundResponse } from '@nestjs/swagger';
import { ChatMessagesService } from './chat-messages.service';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { UpdateChatMessageDto } from './dto/update-chat-message.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ChatMessageResponseDto } from './dto/chat-message-response.dto';

@ApiTags('Chat Messages (REST)')
@ApiBearerAuth()
@Controller('chat-messages')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ChatMessagesController {
  constructor(private readonly service: ChatMessagesService) {}

  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.USER)
  @ApiOperation({ summary: 'Mendapatkan semua pesan dalam sebuah percakapan' })
  @ApiQuery({ name: 'conversationId', description: 'Filter pesan berdasarkan ID percakapan.', type: Number, required: true })
  @ApiResponse({ status: 200, type: [ChatMessageResponseDto] })
  async findAll(@Query('conversationId') conversationId?: number) {
    return this.service.findAll(conversationId ? +conversationId : undefined);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.USER)
  @ApiOperation({ summary: 'Mendapatkan detail satu pesan' })
  @ApiParam({ name: 'id', description: 'ID dari pesan' })
  @ApiResponse({ status: 200, type: ChatMessageResponseDto })
  @ApiNotFoundResponse({ description: 'Pesan tidak ditemukan.' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.OWNER, Role.ADMIN, Role.USER)
  @ApiOperation({ summary: 'Membuat pesan baru via REST API' })
  @ApiResponse({ status: 201, description: 'Pesan berhasil dibuat.', type: ChatMessageResponseDto })
  async create(@Body() dto: CreateChatMessageDto) {
    return this.service.createMessage(dto, dto.senderId);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Mengedit sebuah pesan (Admin/Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID dari pesan yang akan di-update' })
  @ApiResponse({ status: 200, type: ChatMessageResponseDto })
  @ApiNotFoundResponse({ description: 'Pesan tidak ditemukan.' })
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateChatMessageDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Menghapus sebuah pesan (Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID dari pesan yang akan dihapus' })
  @ApiResponse({ status: 200, description: 'Pesan berhasil dihapus.' })
  @ApiNotFoundResponse({ description: 'Pesan tidak ditemukan.' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
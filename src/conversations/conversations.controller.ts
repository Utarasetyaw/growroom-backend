import { Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiNotFoundResponse } from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ConversationResponseDto } from './dto/conversation-response.dto';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';

@ApiTags('Conversations')
@ApiBearerAuth()
@Controller('conversations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ConversationsController {
  constructor(private readonly service: ConversationsService) { }

  // Endpoint ini bisa dihapus jika pembuatan percakapan hanya dimulai oleh user melalui getMyConversation
  @Post()
  @Roles(Role.OWNER, Role.ADMIN) 
  @ApiOperation({ summary: 'Membuat percakapan baru (Admin/Owner)' })
  @ApiResponse({ status: 201, description: 'Percakapan berhasil dibuat.', type: ConversationResponseDto })
  create(@Body() dto: CreateConversationDto) {
    return this.service.create(dto);
  }

  @Get()
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Mendapatkan semua percakapan (Admin/Owner Only)' })
  @ApiResponse({ status: 200, description: 'List semua percakapan.', type: [ConversationResponseDto] })
  findAll() {
    return this.service.findAll();
  }
  
  // Endpoint baru khusus untuk User mengambil percakapannya sendiri
  @Get('my/conversation')
  @Roles(Role.USER) // Hanya untuk user
  @ApiOperation({ summary: 'Mendapatkan percakapan milik user yang login (atau membuat baru jika belum ada)' })
  @ApiResponse({ status: 200, description: 'Data percakapan user.', type: ConversationResponseDto })
  getMyConversation(@Req() req: RequestWithUser) {
    return this.service.findOrCreateForUser(req.user.userId);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.USER)
  @ApiOperation({ summary: 'Mendapatkan detail satu percakapan' })
  @ApiParam({ name: 'id', description: 'ID dari percakapan' })
  @ApiResponse({ status: 200, description: 'Detail percakapan.', type: ConversationResponseDto })
  @ApiNotFoundResponse({ description: 'Percakapan tidak ditemukan.' })
  findOne(@Param('id', ParseIntPipe) id: number) {
    // Di sini bisa ditambahkan validasi agar user hanya bisa akses percakapannya sendiri
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Update percakapan (Admin/Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID dari percakapan yang akan di-update' })
  @ApiResponse({ status: 200, description: 'Percakapan berhasil di-update.', type: ConversationResponseDto })
  @ApiNotFoundResponse({ description: 'Percakapan tidak ditemukan.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateConversationDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Menghapus percakapan (Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID dari percakapan yang akan dihapus' })
  @ApiResponse({ status: 200, description: 'Percakapan berhasil dihapus.' })
  @ApiNotFoundResponse({ description: 'Percakapan tidak ditemukan.' })
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
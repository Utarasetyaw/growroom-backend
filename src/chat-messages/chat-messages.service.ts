import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { UpdateChatMessageDto } from './dto/update-chat-message.dto';

@Injectable()
export class ChatMessagesService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateChatMessageDto) {
    return this.prisma.chatMessage.create({ data: dto });
  }

  async findAll(conversationId?: number) {
    return this.prisma.chatMessage.findMany({
      where: conversationId ? { conversationId } : {},
      include: {
        sender: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: number) {
    const data = await this.prisma.chatMessage.findUnique({
      where: { id },
      include: {
        sender: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    if (!data) throw new NotFoundException('Chat message not found');
    return data;
  }

  async update(id: number, dto: UpdateChatMessageDto) {
    return this.prisma.chatMessage.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    return this.prisma.chatMessage.delete({ where: { id } });
  }
}

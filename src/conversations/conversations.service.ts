import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateConversationDto) {
    return this.prisma.conversation.create({ data: dto });
  }

  async findAll() {
    return this.prisma.conversation.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, senderId: true, content: true, createdAt: true, isRead: true }
        }
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const data = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          select: { id: true, senderId: true, content: true, createdAt: true, isRead: true }
        }
      }
    });
    if (!data) throw new NotFoundException('Conversation not found');
    return data;
  }

  async update(id: number, dto: UpdateConversationDto) {
    return this.prisma.conversation.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    return this.prisma.conversation.delete({ where: { id } });
  }
}

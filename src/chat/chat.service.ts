// src/chat/chat.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // Simpan message baru
  async saveMessage(conversationId: number, senderId: number, content: string) {
    return this.prisma.chatMessage.create({
      data: { conversationId, senderId, content },
      include: { sender: true },
    });
  }

  // Get all messages untuk satu conversation
  async getMessages(conversationId: number) {
    return this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: { sender: true },
    });
  }
}

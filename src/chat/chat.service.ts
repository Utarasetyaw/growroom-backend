// src/chat/chat.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  constructor(private prisma: PrismaService) {}

  // Simpan message baru
  async saveMessage(conversationId: number, senderId: number, content: string) {
    // PERBAIKAN DI SINI:
    // Menggunakan 'select' eksplisit pada 'sender' untuk memastikan data yang dikirim
    // melalui WebSocket selalu lengkap dan konsisten.
    return this.prisma.chatMessage.create({
      data: { conversationId, senderId, content },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  // Get all messages untuk satu conversation
  async getMessages(conversationId: number) {
    return this.prisma.chatMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }
}

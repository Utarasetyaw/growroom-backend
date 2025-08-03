// src/chat/chat.module.ts
import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationsService } from '../conversations/conversations.service';

@Module({
  imports: [
    // Konfigurasi modul JWT untuk verifikasi token di gateway
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-fallback-secret-key', // Gunakan secret dari environment variable
    }),
  ],
  // Sediakan semua service yang dibutuhkan oleh ChatGateway
  providers: [
    ChatGateway,
    ChatService,
    ConversationsService, // Service ini dibutuhkan untuk logika findOrCreate
    PrismaService,
  ],
  exports: [ChatService],
})
export class ChatModule {}

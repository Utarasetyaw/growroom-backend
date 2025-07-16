// src/chat/chat.module.ts
import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [JwtModule.register({ secret: process.env.JWT_SECRET || 'yoursecret' })],
  providers: [ChatGateway, ChatService, PrismaService],
  exports: [ChatService],
})
export class ChatModule {}

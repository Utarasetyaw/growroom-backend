import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { UpdateChatMessageDto } from './dto/update-chat-message.dto';
import { sendTelegramMessage } from '../utils/telegram.util';

@Injectable()
export class ChatMessagesService {
  constructor(private prisma: PrismaService) {}

  // --- CREATE MESSAGE + TELEGRAM NOTIFIKASI ---
  async createMessage(dto: CreateChatMessageDto, senderId: number) {
    // Simpan pesan ke database
    const chatMessage = await this.prisma.chatMessage.create({
      data: {
        conversationId: dto.conversationId,
        senderId: senderId,
        content: dto.content,
      },
      include: {
        sender: { select: { id: true, name: true, email: true, role: true } },
      },
    });

    // Ambil setting Telegram dari GeneralSetting
    const setting = await this.prisma.generalSetting.findUnique({ where: { id: 1 } });
    if (setting?.telegramBotToken && setting?.telegramChatId) {
      // Compose pesan notifikasi
      const senderName = chatMessage.sender?.name || `User#${senderId}`;
      const notifText = `📥 Pesan baru dari *${senderName}*:\n${dto.content}`;
      // Kirim ke Telegram
      sendTelegramMessage(setting.telegramBotToken, setting.telegramChatId, notifText);
    }

    return chatMessage;
  }

  // --- Ambil semua chat message (filter conversationId) ---
  async findAll(conversationId?: number) {
    return this.prisma.chatMessage.findMany({
      where: conversationId ? { conversationId } : {},
      include: {
        sender: { select: { id: true, name: true, email: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  // --- Ambil 1 chat message ---
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

  // --- Update chat message ---
  async update(id: number, dto: UpdateChatMessageDto) {
    return this.prisma.chatMessage.update({ where: { id }, data: dto });
  }

  // --- Delete chat message ---
  async remove(id: number) {
    return this.prisma.chatMessage.delete({ where: { id } });
  }
}

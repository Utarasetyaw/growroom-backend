import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { UpdateChatMessageDto } from './dto/update-chat-message.dto';
import { sendTelegramMessage } from '../utils/telegram.util';
import { ChatMessage, User } from '@prisma/client';

type ChatMessageWithSender = ChatMessage & { sender: User };

@Injectable()
export class ChatMessagesService {
  // Menambahkan Logger untuk output yang lebih terstruktur
  private readonly logger = new Logger(ChatMessagesService.name);

  constructor(private prisma: PrismaService) {}

  async createMessage(dto: CreateChatMessageDto, senderId: number): Promise<ChatMessageWithSender> {
    const chatMessage = await this.prisma.chatMessage.create({
      data: {
        conversationId: dto.conversationId,
        senderId: senderId,
        content: dto.content,
      },
      include: {
        sender: true,
      },
    });

    this._sendTelegramNotification(chatMessage);

    return chatMessage;
  }

  private async _sendTelegramNotification(chatMessage: ChatMessageWithSender): Promise<void> {
    this.logger.log('1. Memulai proses pengecekan notifikasi Telegram...');

    // Langkah 1: Cek role pengirim
    this.logger.log(`2. Mengecek role pengirim: ${chatMessage.sender?.role}`);
    if (chatMessage.sender?.role !== 'USER') {
      this.logger.warn('3. Proses dihentikan: Pengirim bukan "USER".');
      return;
    }
    this.logger.log('3. Kondisi role "USER" terpenuhi, melanjutkan...');

    // Langkah 2: Ambil setting Telegram dari database
    const setting = await this.prisma.generalSetting.findUnique({ where: { id: 1 } });
    this.logger.log(`4. Mengambil data setting dari database...`);
    if (!setting?.telegramBotToken || !setting?.telegramChatId) {
      this.logger.error('5. Proses dihentikan: Bot Token atau Chat ID tidak ditemukan di General Settings.');
      return;
    }
    this.logger.log('5. Setting ditemukan. Melanjutkan persiapan notifikasi...');

    // Langkah 3: Siapkan data untuk template
    const senderName = chatMessage.sender.name || `User #${chatMessage.senderId}`;
    const senderEmail = chatMessage.sender.email;
    const conversationId = chatMessage.conversationId;
    const dashboardUrl = `${process.env.DASHBOARD_URL || 'http://localhost:3000'}/chats/${conversationId}`;

    const notifText = `
🔔 *Anda Menerima Pesan Baru*

Pesan baru telah diterima di percakapan *#${conversationId}* dari:
• *Nama:* ${senderName}
• *Email:* \`${senderEmail}\`

Klik tombol di bawah untuk melihat dan membalasnya.

[Buka Percakapan](${dashboardUrl})
    `;

    this.logger.log(`6. Siap mengirim notifikasi ke Chat ID: ${setting.telegramChatId}`);
    this.logger.log(`7. Menggunakan Token yang berakhir dengan: ...${setting.telegramBotToken.slice(-6)}`);

    // Langkah 4: Panggil fungsi untuk mengirim
    sendTelegramMessage(setting.telegramBotToken, setting.telegramChatId, notifText);
  }

  // --- Metode Lainnya (tidak ada perubahan) ---

  async findAll(conversationId?: number) {
    return this.prisma.chatMessage.findMany({
      where: { conversationId },
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

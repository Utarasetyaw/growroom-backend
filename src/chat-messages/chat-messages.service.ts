import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateChatMessageDto } from './dto/create-chat-message.dto';
import { UpdateChatMessageDto } from './dto/update-chat-message.dto';
import { sendTelegramMessage } from '../utils/telegram.util';
import { ChatMessage, User } from '@prisma/client';

// Membuat tipe data custom untuk hasil query agar lebih aman dan mudah dibaca
type ChatMessageWithSender = ChatMessage & { sender: User };

@Injectable()
export class ChatMessagesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Membuat pesan baru dan memicu notifikasi jika perlu.
   */
  async createMessage(dto: CreateChatMessageDto, senderId: number): Promise<ChatMessageWithSender> {
    const chatMessage = await this.prisma.chatMessage.create({
      data: {
        conversationId: dto.conversationId,
        senderId: senderId,
        content: dto.content,
      },
      include: {
        sender: true, // Mengambil semua data sender untuk notifikasi
      },
    });

    // Memanggil fungsi notifikasi secara terpisah
    this._sendTelegramNotification(chatMessage);

    return chatMessage;
  }

  /**
   * Mengirim notifikasi Telegram jika pengirim adalah USER.
   * Dibuat sebagai private method (_) agar tidak bisa diakses dari luar service ini.
   */
  private async _sendTelegramNotification(chatMessage: ChatMessageWithSender): Promise<void> {
    // 1. Notifikasi hanya dikirim jika pengirim adalah 'USER'
    if (chatMessage.sender?.role !== 'USER') {
      return; // Hentikan proses jika pengirim bukan USER
    }

    // 2. Ambil setting Telegram
    const setting = await this.prisma.generalSetting.findUnique({ where: { id: 1 } });
    if (!setting?.telegramBotToken || !setting?.telegramChatId) {
      console.error('[Telegram] Bot Token atau Chat ID tidak diatur di General Settings.');
      return; // Hentikan jika setting tidak ada
    }

    // 3. Siapkan data untuk template
    const senderName = chatMessage.sender.name || `User #${chatMessage.senderId}`;
    const senderEmail = chatMessage.sender.email;
    const conversationId = chatMessage.conversationId;

    // 4. Praktik terbaik: Ambil URL dasar dari environment variable
    const dashboardUrl = `${process.env.DASHBOARD_URL}/chats/${conversationId}`;

    // 5. Buat teks notifikasi menggunakan template profesional
    const notifText = `
🔔 *Anda Menerima Pesan Baru*

Pesan baru telah diterima di percakapan *#${conversationId}* dari:
• *Nama:* ${senderName}
• *Email:* \`${senderEmail}\`

Klik tombol di bawah untuk melihat dan membalasnya.

[Buka Percakapan](${dashboardUrl})
    `;

    // 6. Kirim notifikasi
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
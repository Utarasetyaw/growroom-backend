import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { ConversationsService } from '../conversations/conversations.service';
import { PrismaService } from '../prisma/prisma.service';
import { sendTelegramMessage } from '../utils/telegram.util';
import { Role } from '@prisma/client';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ namespace: '/ws-chat', cors: true })
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
    private readonly conversationsService: ConversationsService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('✅ Chat WebSocket Gateway Initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = (client.handshake.auth.token || '').replace('Bearer ', '');
      if (!token) throw new Error('No token provided');
      
      const payload = this.jwtService.verify(token);
      
      client.data.user = {
        userId: payload.sub,
        email: payload.email,
        role: payload.role,
        name: payload.name,
      };

      if (client.data.user.role === Role.ADMIN || client.data.user.role === Role.OWNER) {
        client.join('room-admins');
      }
      
      this.logger.log(`[WS] User connected: ${client.data.user.email} (id: ${client.data.user.userId})`);

    } catch (e) {
      this.logger.error(`[WS] Authentication error: ${e.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.user) {
      this.logger.log(`[WS] User disconnected: ${client.data.user.email}`);
    } else {
      this.logger.log('[WS] A client disconnected');
    }
  }

  @SubscribeMessage('joinRoom')
  handleJoinRoom(@MessageBody() data: { conversationId: number }, @ConnectedSocket() client: Socket) {
    if (data && data.conversationId) {
      const roomName = `room-${data.conversationId}`;
      client.join(roomName);
      client.emit('joinedRoom', { room: roomName });
    }
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() payload: { content: string, conversationId?: number },
    @ConnectedSocket() client: Socket,
  ) {
    const user = client.data.user;
    const { content, conversationId: targetConversationId } = payload;

    if (!content || !user) {
      client.emit('error', { message: 'Invalid payload or user not authenticated.' });
      return;
    }

    let finalConversationId: number;

    if (user.role === Role.USER) {
      const conversation = await this.conversationsService.findOrCreateForUser(user.userId);
      finalConversationId = conversation.id;
    } else {
      if (!targetConversationId) {
        client.emit('error', { message: 'Admin/Owner must provide a target conversationId.' });
        return;
      }
      finalConversationId = targetConversationId;
    }

    const message = await this.chatService.saveMessage(finalConversationId, user.userId, content);

    const roomName = `room-${finalConversationId}`;
    this.server.to(roomName).emit('newMessage', message);

    // --- PERUBAHAN LOGIKA NOTIFIKASI ---
    if (user.role === Role.USER) {
      this.server.to('room-admins').emit('adminNotification', {
        type: 'NEW_MESSAGE',
        conversationId: finalConversationId,
        message,
      });
      this._sendUserNotification(message);
    } else if (user.role === Role.ADMIN || user.role === Role.OWNER) {
      // Panggil fungsi notifikasi baru untuk balasan admin/owner
      this._sendAdminReplyNotification(message);
    }
    
    return message;
  }

  /**
   * Mengirim notifikasi ke Telegram saat USER mengirim pesan.
   */
  private async _sendUserNotification(chatMessage: any): Promise<void> {
    this.logger.log('[Telegram] Memulai proses notifikasi pesan user...');

    const setting = await this.prisma.generalSetting.findUnique({ where: { id: 1 } });
    
    if (!setting?.telegramBotToken || !setting?.telegramChatId) {
      this.logger.error('[Telegram] Proses dihentikan: Bot Token atau Chat ID tidak ditemukan.');
      return;
    }

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

    sendTelegramMessage(setting.telegramBotToken, setting.telegramChatId, notifText);
  }

  /**
   * Mengirim notifikasi ke Telegram saat ADMIN/OWNER membalas pesan.
   */
  private async _sendAdminReplyNotification(chatMessage: any): Promise<void> {
    this.logger.log('[Telegram] Memulai proses notifikasi balasan admin...');

    const setting = await this.prisma.generalSetting.findUnique({ where: { id: 1 } });
    if (!setting?.telegramBotToken || !setting?.telegramChatId) {
      this.logger.error('[Telegram] Proses dihentikan: Bot Token atau Chat ID tidak ditemukan.');
      return;
    }

    const conversation = await this.prisma.conversation.findUnique({
      where: { id: chatMessage.conversationId },
      include: { user: true }
    });

    if (!conversation) {
        this.logger.error(`[Telegram] Gagal menemukan percakapan dengan ID: ${chatMessage.conversationId}`);
        return;
    }

    const adminName = chatMessage.sender.name || `Staff #${chatMessage.senderId}`;
    const adminRole = chatMessage.sender.role;
    const targetUserName = conversation.user.name;
    const conversationId = chatMessage.conversationId;
    const messageContent = chatMessage.content;
    const messageTime = new Date(chatMessage.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
    const dashboardUrl = `${process.env.DASHBOARD_URL || 'http://localhost:3000'}/chats/${conversationId}`;

    const notifText = `
✅ *Pesan Telah Dibalas*

*${adminRole}* (${adminName}) telah membalas pesan untuk *${targetUserName}* di percakapan *#${conversationId}*.

*Waktu:* ${messageTime} WIB
*Isi Pesan:*
\`\`\`
${messageContent}
\`\`\`

[Lihat Percakapan](${dashboardUrl})
    `;

    this.logger.log(`[Telegram] Siap mengirim notifikasi balasan ke Chat ID: ${setting.telegramChatId}`);
    sendTelegramMessage(setting.telegramBotToken, setting.telegramChatId, notifText);
  }
}

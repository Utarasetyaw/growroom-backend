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
import { PrismaService } from '../prisma/prisma.service'; // <-- IMPORT PRISMA
import { sendTelegramMessage } from '../utils/telegram.util'; // <-- IMPORT TELEGRAM UTIL
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
    private readonly prisma: PrismaService, // <-- INJECT PRISMA
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
        name: payload.name, // Pastikan 'name' ada di JWT payload Anda
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

    let conversation;
    let finalConversationId: number;

    if (user.role === Role.USER) {
      conversation = await this.conversationsService.findOrCreateForUser(user.userId);
      finalConversationId = conversation.id;
    } else {
      if (!targetConversationId) {
        client.emit('error', { message: 'Admin/Owner must provide a target conversationId.' });
        return;
      }
      finalConversationId = targetConversationId;
    }

    const message = await this.chatService.saveMessage(finalConversationId, user.userId, content);

    // Kirim pesan ke room WebSocket
    const roomName = `room-${finalConversationId}`;
    this.server.to(roomName).emit('newMessage', message);

    // Kirim notifikasi ke admin jika pengirim adalah USER
    if (user.role === Role.USER) {
      this.server.to('room-admins').emit('adminNotification', {
        type: 'NEW_MESSAGE',
        conversationId: finalConversationId,
        message,
      });
      // --- LOGIKA NOTIFIKASI TELEGRAM DIMULAI DI SINI ---
      this._sendTelegramNotification(message);
    }
    
    return message;
  }

  private async _sendTelegramNotification(chatMessage: any): Promise<void> {
    this.logger.log('[Telegram] 1. Memulai proses pengecekan notifikasi...');

    const setting = await this.prisma.generalSetting.findUnique({ where: { id: 1 } });
    this.logger.log('[Telegram] 2. Mengambil data setting dari database...');
    
    if (!setting?.telegramBotToken || !setting?.telegramChatId) {
      this.logger.error('[Telegram] 3. Proses dihentikan: Bot Token atau Chat ID tidak ditemukan.');
      return;
    }
    this.logger.log('[Telegram] 3. Setting ditemukan. Melanjutkan...');

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

    this.logger.log(`[Telegram] 4. Siap mengirim notifikasi ke Chat ID: ${setting.telegramChatId}`);
    sendTelegramMessage(setting.telegramBotToken, setting.telegramChatId, notifText);
  }
}

// src/chat/chat.gateway.ts

import {
  WebSocketGateway, SubscribeMessage, MessageBody, ConnectedSocket, WebSocketServer,
  OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';

@WebSocketGateway({ namespace: '/ws-chat', cors: true })
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  // Map socketId ke user info
  private userMap = new Map<string, { userId: number, role: string, email: string }>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
  ) {}

  afterInit(server: Server) {
    console.log('✅ Chat WebSocket Gateway Initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = (client.handshake.auth.token || '').replace('Bearer ', '');
      if (!token) throw new Error('No token');
      const payload = this.jwtService.verify(token);
      client.data.user = payload;
      this.userMap.set(client.id, { userId: payload.userId, role: payload.role, email: payload.email });
      // Jika admin/owner, join ke room-admins (untuk broadcast notif)
      if (payload.role === 'ADMIN' || payload.role === 'OWNER') {
        client.join('room-admins');
        console.log(`[WS] ${payload.role} joined room-admins`);
      }
      console.log(`[WS] User connected: ${payload.email} (id: ${payload.userId})`);
    } catch (e) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.userMap.delete(client.id);
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(@MessageBody() { conversationId }, @ConnectedSocket() client: Socket) {
    client.join(`room-${conversationId}`);
    client.emit('joined', { room: `room-${conversationId}` });
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @MessageBody() { conversationId, content },
    @ConnectedSocket() client: Socket
  ) {
    const user = client.data.user;
    if (!content || !conversationId) return;

    // Simpan ke DB via service
    const message = await this.chatService.saveMessage(conversationId, user.userId, content);

    // 1. Kirim ke semua user yang join room conversation (user & admin yang join percakapan)
    this.server.to(`room-${conversationId}`).emit('newMessage', message);

    // 2. NOTIFIKASI: Jika pengirim adalah USER, broadcast ke semua admin/owner di 'room-admins'
    if (user.role === 'USER') {
      this.server.to('room-admins').emit('adminNotification', {
        type: 'NEW_CHAT',
        conversationId,
        message,
        from: { id: user.userId, email: user.email }
      });
      // Optionally: Bisa tambahkan logika assignment/auto-assign ke admin
    }
    return message;
  }
}

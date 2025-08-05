// File: src/chat/chat.gateway.ts

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
import { Role } from '@prisma/client';

@WebSocketGateway({ namespace: '/ws-chat', cors: true })
export class ChatGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly chatService: ChatService,
    private readonly conversationsService: ConversationsService,
  ) {}

  afterInit(server: Server) {
    console.log('✅ Chat WebSocket Gateway Initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = (client.handshake.auth.token || '').replace('Bearer ', '');
      if (!token) {
        throw new Error('No token provided');
      }
      
      const payload = this.jwtService.verify(token);
      
      // 👇 REVISI KUNCI ADA DI SINI
      // Buat objek user yang konsisten di dalam data socket
      client.data.user = {
        userId: payload.sub, // Ambil ID dari 'sub'
        email: payload.email,
        role: payload.role,
        permissions: payload.permissions,
      };

      if (client.data.user.role === Role.ADMIN || client.data.user.role === Role.OWNER) {
        client.join('room-admins');
      }
      
      // Sekarang client.data.user.userId sudah benar
      console.log(`[WS] User connected: ${client.data.user.email} (id: ${client.data.user.userId})`);

    } catch (e) {
      console.error(`[WS] Authentication error: ${e.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.user) {
      console.log(`[WS] User disconnected: ${client.data.user.email}`);
    } else {
      console.log('[WS] A client disconnected');
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
    const user = client.data.user; // Sekarang user memiliki properti .userId
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

    // Sekarang user.userId sudah pasti berisi angka ID yang benar
    const message = await this.chatService.saveMessage(finalConversationId, user.userId, content);

    const roomName = `room-${finalConversationId}`;
    this.server.to(roomName).emit('newMessage', message);

    if (user.role === Role.USER) {
      this.server.to('room-admins').emit('adminNotification', {
        type: 'NEW_MESSAGE',
        conversationId: finalConversationId,
        message,
      });
    }
    
    return message;
  }
}
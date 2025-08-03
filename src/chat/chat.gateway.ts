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
      client.data.user = payload;

      // Jika admin/owner, join ke room khusus admin untuk notifikasi
      if (payload.role === 'ADMIN' || payload.role === 'OWNER') {
        client.join('room-admins');
      }
      
      console.log(`[WS] User connected: ${payload.email} (id: ${payload.userId})`);
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
      // Kirim konfirmasi kembali ke client bahwa mereka berhasil join
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

    if (user.role === 'USER') {
      // Jika pengirim adalah USER, cari atau buat percakapan baru untuknya.
      conversation = await this.conversationsService.findOrCreateForUser(user.userId);
    } else {
      // Jika pengirim adalah ADMIN/OWNER, mereka harus menyediakan conversationId.
      if (!targetConversationId) {
        client.emit('error', { message: 'Admin/Owner must provide a target conversationId.' });
        return;
      }
      conversation = { id: targetConversationId };
    }

    // Simpan pesan ke database melalui service.
    const message = await this.chatService.saveMessage(conversation.id, user.userId, content);

    // Kirim pesan baru ke semua client yang ada di room percakapan tersebut.
    this.server.to(`room-${conversation.id}`).emit('newMessage', message);

    // Jika pengirim adalah USER, kirim notifikasi ke semua admin yang online.
    if (user.role === 'USER') {
      this.server.to('room-admins').emit('adminNotification', {
        type: 'NEW_MESSAGE',
        conversationId: conversation.id,
        message,
      });
    }
    
    // Kirim konfirmasi kembali ke pengirim bahwa pesan berhasil dikirim.
    return message;
  }
}
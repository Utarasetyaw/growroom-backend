import { Module } from '@nestjs/common';
import { ChatGateway } from './chat.gateway';
import { ChatService } from './chat.service';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { ConversationsService } from '../conversations/conversations.service';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    // Gunakan registerAsync untuk mengambil secret dari ConfigService secara dinamis
    JwtModule.registerAsync({
      imports: [ConfigModule], // Impor ConfigModule agar ConfigService bisa di-inject
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'), // Ambil secret key dari .env
      }),
      inject: [ConfigService], // Inject ConfigService ke dalam factory
    }),
  ],
  providers: [
    ChatGateway,
    ChatService,
    ConversationsService,
    PrismaService,
  ],
  exports: [ChatService],
})
export class ChatModule {}
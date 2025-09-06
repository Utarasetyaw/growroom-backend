import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Mencari atau membuat percakapan untuk user, dan mengembalikan data lengkap.
   * @param userId - ID dari user
   */
  async findOrCreateForUser(userId: number) {
    // Definisikan data yang ingin disertakan agar konsisten
    const includePayload = {
        messages: { 
            orderBy: { createdAt: 'asc' as const }, 
            include: { sender: true } 
        }, 
        user: true, 
        assignedTo: true 
    };

    const existingConversation = await this.prisma.conversation.findFirst({
      where: { userId },
      include: includePayload, // Gunakan include payload di sini
    });

    if (existingConversation) {
      return existingConversation;
    }

    // Jika tidak ada, buat yang baru dengan menyertakan data yang sama
    return this.prisma.conversation.create({
      data: {
        userId: userId,
        status: 'OPEN',
      },
      include: includePayload, // Gunakan include payload di sini juga
    });
  }

  /**
   * Membuat percakapan baru secara eksplisit (digunakan oleh admin).
   */
  async create(dto: CreateConversationDto) {
    return this.prisma.conversation.create({ data: dto });
  }

  /**
   * Mengambil semua percakapan untuk panel admin.
   */
  async findAll() {
    return this.prisma.conversation.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            // PERBAIKAN DI SINI: Meminta data sender yang lengkap.
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Mengambil detail satu percakapan, termasuk semua pesannya.
   */
  async findOne(id: number) {
    const data = await this.prisma.conversation.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: true
          }
        }
      }
    });
    if (!data) {
      throw new NotFoundException('Conversation not found');
    }
    return data;
  }

  /**
   * Mengupdate status atau admin yang ditugaskan pada sebuah percakapan.
   */
  async update(id: number, dto: UpdateConversationDto) {
    const existing = await this.prisma.conversation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }
    return this.prisma.conversation.update({ where: { id }, data: dto });
  }

  /**
   * Menghapus sebuah percakapan.
   */
  async remove(id: number) {
    const existing = await this.prisma.conversation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }
    return this.prisma.conversation.delete({ where: { id } });
  }
}

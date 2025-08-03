import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';

@Injectable()
export class ConversationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Mencari percakapan yang sudah ada untuk seorang user.
   * Jika tidak ditemukan, maka akan membuat percakapan baru.
   * @param userId - ID dari user
   * @returns Conversation object
   */
  async findOrCreateForUser(userId: number) {
    const existingConversation = await this.prisma.conversation.findFirst({
      where: { userId },
    });

    if (existingConversation) {
      return existingConversation;
    }

    return this.prisma.conversation.create({
      data: {
        userId: userId,
        status: 'OPEN', // Status default untuk admin
      },
    });
  }

  /**
   * Membuat percakapan baru secara eksplisit (digunakan oleh REST API).
   */
  async create(dto: CreateConversationDto) {
    return this.prisma.conversation.create({ data: dto });
  }

  /**
   * Mengambil semua percakapan. Dioptimalkan untuk hanya mengambil
   * pesan terakhir sebagai preview.
   */
  async findAll() {
    return this.prisma.conversation.findMany({
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        assignedTo: { select: { id: true, name: true, email: true, role: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Hanya ambil 1 pesan terakhir
          include: {
            sender: { select: { role: true } }
          }
        }
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
          orderBy: { createdAt: 'asc' }, // Ambil semua pesan, urutkan dari yang terlama
          include: {
            sender: true // Sertakan info lengkap pengirim pesan
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
    // Pastikan percakapan ada sebelum update
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
    // Pastikan percakapan ada sebelum dihapus
    const existing = await this.prisma.conversation.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Conversation with ID ${id} not found`);
    }
    return this.prisma.conversation.delete({ where: { id } });
  }
}
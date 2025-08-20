import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto'; // <-- 1. Impor DTO yang baru

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOneByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findAll(role?: Role): Promise<User[]> {
    return this.prisma.user.findMany({
      where: role ? { role } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number): Promise<User & { orders?: any[] }> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        orders: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async createUser(data: any): Promise<Omit<User, 'password'>> {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    const { password, ...user } = await this.prisma.user.create({ data });
    return user;
  }

  async updateUser(id: number, data: any): Promise<Omit<User, 'password'>> {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    const { password, ...user } = await this.prisma.user.update({ where: { id }, data });
    return user;
  }

  async deleteUser(id: number) {
    return this.prisma.user.delete({ where: { id } });
  }

  async updatePermissions(id: number, permissions: string[]) {
    const { password, ...user } = await this.prisma.user.update({ where: { id }, data: { permissions } });
    return user;
  }

  // ================== PROFILE USER (me) ==================

  async findMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        orders: {
          include: {
            orderItems: {
              include: {
                product: {
                  include: {
                    images: { take: 1 },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        cart: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User profile not found');

    const { password, ...result } = user;
    return result;
  }

  /**
   * Mengupdate data profil user yang sedang login.
   * @param userId ID dari user yang sedang login
   * @param data Data yang akan diupdate
   */
  // --- PERBAIKAN DI SINI ---
  async updateMe(userId: number, data: UpdateMyProfileDto) {
    const updateData: any = { ...data };

    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    } else {
      delete updateData.password; // Pastikan password kosong tidak menimpa yang sudah ada
    }

    // Prisma akan secara otomatis menangani objek `address` dan `socialMedia`
    // dan menyimpannya sebagai JSON di database.
    return this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true, email: true, name: true, phone: true, address: true,
        socialMedia: true, updatedAt: true,
      },
    });
  }
}

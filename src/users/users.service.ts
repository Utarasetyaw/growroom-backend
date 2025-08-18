import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

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
      // 👇 PERUBAHAN UTAMA DI SINI
      include: {
        orders: {
          orderBy: { createdAt: 'desc' }, // Mengurutkan pesanan terbaru
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

  /**
   * Mengambil data profil lengkap untuk user yang sedang login,
   * termasuk riwayat order dan isi keranjang.
   * @param userId ID dari user yang sedang login
   */
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
  async updateMe(userId: number, data: any) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true, email: true, name: true, phone: true, address: true,
        socialMedia: true, updatedAt: true,
      },
    });
  }
}

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

  async findOne(id: number): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
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
          orderBy: { createdAt: 'desc' },
          take: 5, // Ambil 5 order terakhir untuk efisiensi
        },
        cart: {
          include: {
            items: true, // Sertakan item di dalam keranjang
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User profile not found');

    // Hapus password dari objek sebelum dikirim ke frontend
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
      // Pilih field yang akan dikembalikan, pastikan tidak ada password
      select: {
        id: true, email: true, name: true, phone: true, address: true,
        city: true, province: true, country: true, postalCode: true,
        socialMedia: true, updatedAt: true,
      },
    });
  }
}
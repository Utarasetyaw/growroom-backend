import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, User } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  // Cari user by email (untuk login/register)
  async findOneByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  // List user (opsional filter by role)
  async findAll(role?: Role): Promise<User[]> {
    return this.prisma.user.findMany({
      where: role ? { role } : {},
      orderBy: { createdAt: 'desc' },
    });
  }

  // Cari user by id (untuk detail admin/owner)
  async findOne(id: number): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  // OWNER: Tambah user/admin
  async createUser(data: any): Promise<User> {
    // Hash password jika ada
    if (data.password) {
      const bcrypt = require('bcrypt');
      data.password = await bcrypt.hash(data.password, 10);
    }
    return this.prisma.user.create({ data });
  }

  // OWNER/ADMIN: Update user/admin (by id)
  async updateUser(id: number, data: any): Promise<User> {
    if (data.password) {
      const bcrypt = require('bcrypt');
      data.password = await bcrypt.hash(data.password, 10);
    }
    return this.prisma.user.update({ where: { id }, data });
  }

  // OWNER/ADMIN: Hapus user/admin
  async deleteUser(id: number) {
    return this.prisma.user.delete({ where: { id } });
  }

  // OWNER: Edit permissions admin (khusus)
  async updatePermissions(id: number, permissions: string[]) {
    return this.prisma.user.update({
      where: { id },
      data: { permissions },
    });
  }

  // ================== PROFILE USER (me) ==================

  // GET /users/me
  async findMe(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        address: true,
        city: true,
        province: true,
        country: true,
        postalCode: true,
        socialMedia: true,
        createdAt: true,
        updatedAt: true,
        orders: {
          include: {
            orderItems: {
              include: { product: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
      }
    });
  }

  // PATCH /users/me
  async updateMe(userId: number, data: any) {
    if (data.password) {
      const bcrypt = require('bcrypt');
      data.password = await bcrypt.hash(data.password, 10);
    }
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true, email: true, name: true, phone: true, address: true,
        city: true, province: true, country: true, postalCode: true,
        socialMedia: true, updatedAt: true
      }
    });
  }
}

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

  async createUser(data: any): Promise<User> {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    return this.prisma.user.create({ data });
  }

  async updateUser(id: number, data: any): Promise<User> {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    return this.prisma.user.update({ where: { id }, data });
  }

  async deleteUser(id: number) {
    return this.prisma.user.delete({ where: { id } });
  }

  async updatePermissions(id: number, permissions: string[]) {
    return this.prisma.user.update({ where: { id }, data: { permissions } });
  }

  // ================== PROFILE USER (me) ==================
  async findMe(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      // ✅ PERBAIKAN: Pastikan 'role' dan 'permissions' disertakan dalam select
      select: {
        id: true,
        email: true,
        name: true,
        role: true,          // <-- WAJIB ADA
        permissions: true,   // <-- WAJIB ADA
        phone: true,
        address: true,
        city: true,
        province: true,
        country: true,
        postalCode: true,
        socialMedia: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!user) throw new NotFoundException('User profile not found');
    return user;
  }

  async updateMe(userId: number, data: any) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true, email: true, name: true, phone: true, address: true,
        city: true, province: true, country: true, postalCode: true,
        socialMedia: true, updatedAt: true,
      },
    });
  }
}

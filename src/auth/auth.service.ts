// src/auth/auth.service.ts
import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  async login(user: any) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      permissions: user.permissions,
    };
    return {
      message: 'Login successful',
      access_token: this.jwtService.sign(payload),
    };
  }

  async register(data: any, allowedRole: Role) {
    // Cek jika email sudah ada
    const existing = await this.usersService.findOneByEmail(data.email);
    if (existing) throw new BadRequestException('Email already registered');

    // Hanya bisa register role yg diizinkan
    if (data.role !== allowedRole)
      throw new ForbiddenException('You can only register as ' + allowedRole);

    // Untuk ADMIN/OWNER, bisa tambahkan proteksi lebih (misal: kode khusus)
    if (allowedRole === Role.OWNER) {
      // Cegah sembarang user register jadi OWNER, misal
      throw new ForbiddenException('Owner registration is only allowed by superadmin');
    }

    const hashed = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashed,
        role: data.role,
        permissions: data.permissions || [],
      },
    });
    return { message: 'Registration successful', user: { ...user, password: undefined } };
  }
}

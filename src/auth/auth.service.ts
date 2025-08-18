// src/auth/service.ts

import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Role, User } from '@prisma/client';

// Definisikan tipe untuk hasil validasi
export interface LoginValidationResult {
  success: boolean;
  message: string;
  user?: Omit<User, 'password'>;
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  /**
   * Memvalidasi percobaan login dan mengembalikan hasil yang terstruktur.
   * Tidak melempar error, tetapi mengembalikan objek status.
   */
  async validateLoginAttempt(email: string, pass: string, expectedRole: Role): Promise<LoginValidationResult> {
    const user = await this.usersService.findOneByEmail(email);

    // Kasus 1: Email tidak ditemukan
    if (!user) {
      return { success: false, message: 'Email not found' };
    }

    // Kasus 2: Password tidak cocok
    const isPasswordMatch = await bcrypt.compare(pass, user.password);
    if (!isPasswordMatch) {
      return { success: false, message: 'Incorrect password' };
    }

    // Kasus 3: Role tidak sesuai
    if (user.role !== expectedRole) {
      return { success: false, message: `Access denied. This login is for ${expectedRole}s only.` };
    }

    // Kasus 4: Login berhasil
    const { password, ...result } = user;
    return { success: true, message: 'Login successful', user: result };
  }

  /**
   * Membuat token JWT HANYA jika validasi berhasil.
   */
  async login(user: Omit<User, 'password'>) {
    const payload = {
      email: user.email,
      sub: user.id,
      role: user.role,
      permissions: user.permissions,
    };

    return {
      message: 'Login successful',
      access_token: this.jwtService.sign(payload),
      user: user,
    };
  }

  /**
   * Registrasi user baru. (Tidak ada perubahan di sini)
   */
  async register(data: any, allowedRole: Role) {
    const existingUser = await this.usersService.findOneByEmail(data.email);
    if (existingUser) {
      throw new BadRequestException('Email is already registered.');
    }

    if (data.role !== allowedRole) {
      throw new ForbiddenException(`Registration is only allowed for the ${allowedRole} role.`);
    }

    if (allowedRole === Role.OWNER) {
      const ownerExists = await this.prisma.user.findFirst({ where: { role: Role.OWNER } });
      if (ownerExists) {
        throw new ForbiddenException('An owner account already exists.');
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const newUser = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: data.role,
        permissions: data.permissions || [],
      },
    });

    const { password, ...result } = newUser;
    return {
      message: 'Registration successful',
      user: result,
    };
  }
}

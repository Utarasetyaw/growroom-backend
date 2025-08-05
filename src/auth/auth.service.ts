import { Injectable, BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Role, User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  /**
   * Memvalidasi user berdasarkan email, password, DAN role yang diharapkan.
   */
  async validateUser(email: string, pass: string, expectedRole: Role): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);
    // Cek user ada, password cocok, DAN role-nya sesuai
    if (user && user.role === expectedRole && (await bcrypt.compare(pass, user.password))) {
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  /**
   * Membuat token JWT untuk user yang sudah tervalidasi.
   */
  async login(user: User, expectedRole: Role) {
    // Validasi tambahan untuk memastikan role-nya benar
    if (user.role !== expectedRole) {
      throw new UnauthorizedException(`This login is for ${expectedRole}s only.`);
    }

    // 👇 INI BAGIAN PALING PENTING
    // Payload harus berisi 'sub' yang diisi dengan 'user.id'
    const payload = {
      email: user.email,
      sub: user.id, // 'sub' akan dibaca sebagai 'userId' oleh JwtStrategy
      role: user.role,
      permissions: user.permissions,
    };
    
    const { password, ...userProfile } = user;

    return {
      message: 'Login successful',
      access_token: this.jwtService.sign(payload),
      user: userProfile,
    };
  }

  /**
   * Registrasi user baru.
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
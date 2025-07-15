import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Role } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login-user')
  async loginUser(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) throw new UnauthorizedException('Email atau password salah');
    if (user.role !== Role.USER) throw new UnauthorizedException('Not a user');
    return this.authService.login(user);
  }

  @Post('login-admin')
  async loginAdmin(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) throw new UnauthorizedException('Email atau password salah');
    if (user.role !== Role.ADMIN) throw new UnauthorizedException('Not an admin');
    return this.authService.login(user);
  }

  @Post('login-owner')
  async loginOwner(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) throw new UnauthorizedException('Email atau password salah');
    if (user.role !== Role.OWNER) throw new UnauthorizedException('Not an owner');
    return this.authService.login(user);
  }

  @Post('register-user')
  async registerUser(@Body() dto: RegisterDto) {
    return this.authService.register({ ...dto, role: Role.USER }, Role.USER);
  }

  @Post('register-admin')
  async registerAdmin(@Body() dto: RegisterDto) {
    return this.authService.register({ ...dto, role: Role.ADMIN }, Role.ADMIN);
  }

  @Post('register-owner')
  async registerOwner(@Body() dto: RegisterDto) {
    // Jika ingin membatasi siapa yang boleh register owner, tambahkan pengecekan di AuthService
    return this.authService.register({ ...dto, role: Role.OWNER }, Role.OWNER);
  }
}

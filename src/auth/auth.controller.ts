import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password,
    );

    if (!user) {
      throw new UnauthorizedException('Email atau password salah');
    }

    if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
      throw new UnauthorizedException('Hanya Owner dan Admin yang bisa login');
    }
    
    return this.authService.login(user);
  }
}
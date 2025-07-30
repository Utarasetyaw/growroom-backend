import { Controller, Post, Body, UnauthorizedException } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Role } from '@prisma/client';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterResponseDto } from './dto/register-response.dto';

@ApiTags('Authentication') // ✅ Mengelompokkan semua endpoint di bawah tag "Authentication"
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login-user')
  @ApiOperation({ summary: 'Login untuk role USER' }) // ✅ Deskripsi endpoint
  @ApiBody({ type: LoginDto }) // ✅ Mendefinisikan body request
  @ApiResponse({ status: 201, description: 'Login berhasil.', type: LoginResponseDto }) // ✅ Respons sukses
  @ApiUnauthorizedResponse({ description: 'Email/password salah atau bukan role USER.' }) // ✅ Respons error
  async loginUser(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) throw new UnauthorizedException('Email atau password salah');
    if (user.role !== Role.USER) throw new UnauthorizedException('Not a user');
    return this.authService.login(user);
  }

  @Post('login-admin')
  @ApiOperation({ summary: 'Login untuk role ADMIN' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 201, description: 'Login berhasil.', type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Email/password salah atau bukan role ADMIN.' })
  async loginAdmin(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) throw new UnauthorizedException('Email atau password salah');
    if (user.role !== Role.ADMIN) throw new UnauthorizedException('Not an admin');
    return this.authService.login(user);
  }

  @Post('login-owner')
  @ApiOperation({ summary: 'Login untuk role OWNER' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 201, description: 'Login berhasil.', type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Email/password salah atau bukan role OWNER.' })
  async loginOwner(@Body() loginDto: LoginDto) {
    const user = await this.authService.validateUser(loginDto.email, loginDto.password);
    if (!user) throw new UnauthorizedException('Email atau password salah');
    if (user.role !== Role.OWNER) throw new UnauthorizedException('Not an owner');
    return this.authService.login(user);
  }

  @Post('register-user')
  @ApiOperation({ summary: 'Registrasi akun baru sebagai USER' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Registrasi berhasil.', type: RegisterResponseDto })
  @ApiBadRequestResponse({ description: 'Email sudah terdaftar.' })
  async registerUser(@Body() dto: RegisterDto) {
    return this.authService.register({ ...dto, role: Role.USER }, Role.USER);
  }

  @Post('register-admin')
  @ApiOperation({ summary: 'Registrasi akun baru sebagai ADMIN' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Registrasi berhasil.', type: RegisterResponseDto })
  @ApiBadRequestResponse({ description: 'Email sudah terdaftar.' })
  async registerAdmin(@Body() dto: RegisterDto) {
    return this.authService.register({ ...dto, role: Role.ADMIN }, Role.ADMIN);
  }

  @Post('register-owner')
  @ApiOperation({ summary: 'Registrasi akun baru sebagai OWNER' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Registrasi berhasil.', type: RegisterResponseDto })
  @ApiBadRequestResponse({ description: 'Email sudah terdaftar.' })
  async registerOwner(@Body() dto: RegisterDto) {
    return this.authService.register({ ...dto, role: Role.OWNER }, Role.OWNER);
  }
}
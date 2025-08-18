// src/auth/auth.controller.ts

import { Controller, Post, Body, HttpStatus, HttpCode, Res } from '@nestjs/common';
import { Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { Role } from '@prisma/client';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterResponseDto } from './dto/register-response.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  // Helper function untuk menangani logika login
  private async handleLogin(res: Response, loginDto: LoginDto, role: Role) {
    const validationResult = await this.authService.validateLoginAttempt(
      loginDto.email,
      loginDto.password,
      role,
    );

    if (!validationResult.success) {
      // Jika validasi gagal, kirim pesan error dengan status 200 OK
      return res.status(HttpStatus.OK).json({
        success: false,
        message: validationResult.message,
      });
    }

    // Jika berhasil, buat token dan kirim respons sukses
    if (!validationResult.user) {
      return res.status(HttpStatus.OK).json({
        success: false,
        message: 'User data not found after validation.',
      });
    }
    const loginData = await this.authService.login(validationResult.user);
    return res.status(HttpStatus.OK).json({
        success: true,
        ...loginData
    });
  }

  @Post('login-user')
  @HttpCode(HttpStatus.OK) // Selalu kembalikan 200 OK
  @ApiOperation({ summary: 'Login untuk role USER' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Percobaan login diproses.', type: LoginResponseDto })
  async loginUser(@Body() loginDto: LoginDto, @Res() res: Response) {
    return this.handleLogin(res, loginDto, Role.USER);
  }

  @Post('login-admin')
  @HttpCode(HttpStatus.OK) // Selalu kembalikan 200 OK
  @ApiOperation({ summary: 'Login untuk role ADMIN' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Percobaan login diproses.', type: LoginResponseDto })
  async loginAdmin(@Body() loginDto: LoginDto, @Res() res: Response) {
    return this.handleLogin(res, loginDto, Role.ADMIN);
  }

  @Post('login-owner')
  @HttpCode(HttpStatus.OK) // Selalu kembalikan 200 OK
  @ApiOperation({ summary: 'Login untuk role OWNER' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: HttpStatus.OK, description: 'Percobaan login diproses.', type: LoginResponseDto })
  async loginOwner(@Body() loginDto: LoginDto, @Res() res: Response) {
    return this.handleLogin(res, loginDto, Role.OWNER);
  }

  @Post('register-user')
  @ApiOperation({ summary: 'Registrasi akun baru sebagai USER' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Registrasi berhasil.', type: RegisterResponseDto })
  async registerUser(@Body() dto: RegisterDto) {
    return this.authService.register({ ...dto, role: Role.USER }, Role.USER);
  }

  @Post('register-admin')
  @ApiOperation({ summary: 'Registrasi akun baru sebagai ADMIN (biasanya tidak publik)' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Registrasi berhasil.', type: RegisterResponseDto })
  async registerAdmin(@Body() dto: RegisterDto) {
    return this.authService.register({ ...dto, role: Role.ADMIN }, Role.ADMIN);
  }

  @Post('register-owner')
  @ApiOperation({ summary: 'Registrasi akun baru sebagai OWNER (biasanya tidak publik)' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Registrasi berhasil.', type: RegisterResponseDto })
  async registerOwner(@Body() dto: RegisterDto) {
    return this.authService.register({ ...dto, role: Role.OWNER }, Role.OWNER);
  }
}

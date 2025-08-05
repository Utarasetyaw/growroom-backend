import { Controller, Post, Body, UnauthorizedException, HttpStatus } from '@nestjs/common';
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

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login-user')
  @ApiOperation({ summary: 'Login untuk role USER' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Login berhasil.', type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Email/password salah atau bukan role USER.' })
  async loginUser(@Body() loginDto: LoginDto) {
    // 👇 Kirim 'Role.USER' sebagai argumen ketiga
    const user = await this.authService.validateUser(loginDto.email, loginDto.password, Role.USER);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials or not a USER role');
    }
    // 👇 Kirim 'Role.USER' sebagai argumen kedua
    return this.authService.login(user, Role.USER);
  }

  @Post('login-admin')
  @ApiOperation({ summary: 'Login untuk role ADMIN' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Login berhasil.', type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Email/password salah atau bukan role ADMIN.' })
  async loginAdmin(@Body() loginDto: LoginDto) {
    // 👇 Kirim 'Role.ADMIN' sebagai argumen ketiga
    const user = await this.authService.validateUser(loginDto.email, loginDto.password, Role.ADMIN);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials or not an ADMIN role');
    }
    // 👇 Kirim 'Role.ADMIN' sebagai argumen kedua
    return this.authService.login(user, Role.ADMIN);
  }

  @Post('login-owner')
  @ApiOperation({ summary: 'Login untuk role OWNER' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Login berhasil.', type: LoginResponseDto })
  @ApiUnauthorizedResponse({ description: 'Email/password salah atau bukan role OWNER.' })
  async loginOwner(@Body() loginDto: LoginDto) {
    // 👇 Kirim 'Role.OWNER' sebagai argumen ketiga
    const user = await this.authService.validateUser(loginDto.email, loginDto.password, Role.OWNER);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials or not an OWNER role');
    }
    // 👇 Kirim 'Role.OWNER' sebagai argumen kedua
    return this.authService.login(user, Role.OWNER);
  }

  @Post('register-user')
  @ApiOperation({ summary: 'Registrasi akun baru sebagai USER' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Registrasi berhasil.', type: RegisterResponseDto })
  @ApiBadRequestResponse({ description: 'Email sudah terdaftar.' })
  async registerUser(@Body() dto: RegisterDto) {
    // Kode ini sudah benar, tidak perlu diubah
    return this.authService.register({ ...dto, role: Role.USER }, Role.USER);
  }

  // Anda bisa menghapus endpoint register untuk Admin dan Owner jika tidak diperlukan dari publik
  @Post('register-admin')
  @ApiOperation({ summary: 'Registrasi akun baru sebagai ADMIN (biasanya tidak publik)' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Registrasi berhasil.', type: RegisterResponseDto })
  @ApiBadRequestResponse({ description: 'Email sudah terdaftar.' })
  async registerAdmin(@Body() dto: RegisterDto) {
    return this.authService.register({ ...dto, role: Role.ADMIN }, Role.ADMIN);
  }

  @Post('register-owner')
  @ApiOperation({ summary: 'Registrasi akun baru sebagai OWNER (biasanya tidak publik)' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Registrasi berhasil.', type: RegisterResponseDto })
  @ApiBadRequestResponse({ description: 'Email sudah terdaftar.' })
  async registerOwner(@Body() dto: RegisterDto) {
    return this.authService.register({ ...dto, role: Role.OWNER }, Role.OWNER);
  }
}
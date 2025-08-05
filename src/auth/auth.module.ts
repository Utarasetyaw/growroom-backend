import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { ConfigModule, ConfigService } from '@nestjs/config'; // 👈 1. Impor ConfigModule & ConfigService
@Module({
  imports: [
    UsersModule,
    PassportModule,
    ConfigModule, // 👈 2. Impor ConfigModule di sini
    // 👇 3. Ganti JwtModule.register menjadi registerAsync
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'), // Ambil secret dari .env
        signOptions: { expiresIn: '1d' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  // 👇 4. Pastikan JwtModule juga diekspor
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
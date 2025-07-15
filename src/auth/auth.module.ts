import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy'; // Tambahkan ini!
export const jwtSecret = 'SECRET_KEY_YANG_SANGAT_RAHASIA';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({
      secret: jwtSecret,
      signOptions: { expiresIn: '1d' },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy, // <- Tambahkan strategy di provider
  ],
  exports: [JwtModule],
})
export class AuthModule {}

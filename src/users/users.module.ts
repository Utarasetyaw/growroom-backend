import { Module } from '@nestjs/common';
import { UsersService } from './users.service';

@Module({
  providers: [UsersService],
  exports: [UsersService], // Export service agar bisa digunakan di AuthModule
})
export class UsersModule {}
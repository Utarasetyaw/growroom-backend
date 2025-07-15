import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TestimonialsModule } from './testimonials/testimonials.module';
import { GeneralsettingModule } from './generalsetting/generalsetting.module';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, TestimonialsModule, GeneralsettingModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
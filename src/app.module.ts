import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TestimonialsModule } from './testimonials/testimonials.module';
import { GeneralsettingModule } from './generalsetting/generalsetting.module';
import { LanguagesModule } from './languages/languages.module';

@Module({
  imports: [PrismaModule, UsersModule, AuthModule, TestimonialsModule, GeneralsettingModule, LanguagesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
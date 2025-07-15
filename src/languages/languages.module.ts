import { Module } from '@nestjs/common';
import { LanguagesController } from './languages.controller';
import { LanguagesService } from './languages.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [LanguagesController],
  providers: [LanguagesService, PrismaService],
})
export class LanguagesModule {}

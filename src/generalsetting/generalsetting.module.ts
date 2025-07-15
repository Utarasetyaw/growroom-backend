// src/generalsetting/generalsetting.module.ts
import { Module } from '@nestjs/common';
import { GeneralsettingService } from './generalsetting.service';
import { GeneralsettingController } from './generalsetting.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [GeneralsettingController],
  providers: [GeneralsettingService, PrismaService],
  exports: [GeneralsettingService],
})
export class GeneralsettingModule {}

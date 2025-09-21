// File: src/discounts/discounts.module.ts

import { Module } from '@nestjs/common';
import { DiscountsService } from './discounts.service';
import { DiscountsController } from './discounts.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [],
  controllers: [DiscountsController],
  providers: [DiscountsService, PrismaService],
  exports: [DiscountsService],
})
export class DiscountsModule {}
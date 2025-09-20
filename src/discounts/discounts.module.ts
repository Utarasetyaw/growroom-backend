import { Module } from '@nestjs/common';
import { DiscountsService } from './discounts.service';
import { DiscountsController } from './discounts.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [],
  controllers: [DiscountsController],
  providers: [DiscountsService, PrismaService],
  // --- TAMBAHKAN BARIS INI ---
  exports: [DiscountsService], 
})
export class DiscountsModule {}
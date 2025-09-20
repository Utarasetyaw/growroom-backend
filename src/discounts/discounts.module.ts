// File: src/discounts/discounts.module.ts

import { Module } from '@nestjs/common';
import { DiscountsService } from './discounts.service';
import { DiscountsController } from './discounts.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  imports: [], // Jika modul ini butuh modul lain, impor di sini
  controllers: [DiscountsController], // Daftarkan controller di sini
  providers: [DiscountsService, PrismaService], // Daftarkan service di sini
})
export class DiscountsModule {}
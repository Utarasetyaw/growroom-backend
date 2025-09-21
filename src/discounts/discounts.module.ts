import { Module } from '@nestjs/common';
import { DiscountsService } from './discounts.service';
import { DiscountsController } from './discounts.controller';
import { PrismaModule } from '../prisma/prisma.module'; // <-- 1. Import PrismaModule

@Module({
  imports: [
    PrismaModule, // <-- 2. Daftarkan PrismaModule di sini
  ],
  controllers: [DiscountsController],
  providers: [
    DiscountsService, 
    // PrismaService dihapus dari sini karena sudah disediakan oleh PrismaModule
  ],
  exports: [DiscountsService], // Ini sudah benar
})
export class DiscountsModule {}
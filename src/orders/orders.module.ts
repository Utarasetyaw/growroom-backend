// File: src/orders/orders.module.ts

import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { CartModule } from '../cart/cart.module';
// --- 1. Impor Modul Baru ---
import { MidtransModule } from '../midtrans/midtrans.module';
import { PaypalModule } from '../paypal/paypal.module';

@Module({
  // --- 2. Hapus PaymentModule dan Daftarkan Modul Baru ---
  imports: [
    CartModule,
    MidtransModule, // Daftarkan di sini
    PaypalModule,   // Daftarkan di sini
  ],
  controllers: [OrdersController],
  providers: [OrdersService, PrismaService],
  exports: [OrdersService],
})
export class OrdersModule {}

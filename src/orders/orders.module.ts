// src/orders/orders.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { CartModule } from '../cart/cart.module';
// Impor modul yang dibutuhkan
import { MidtransModule } from '../midtrans/midtrans.module';
import { PaypalModule } from '../paypal/paypal.module';

@Module({
  imports: [
    CartModule,
    MidtransModule, // <-- PASTIKAN BARIS INI ADA
    forwardRef(() => PaypalModule),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, PrismaService],
  exports: [OrdersService],
})
export class OrdersModule {}
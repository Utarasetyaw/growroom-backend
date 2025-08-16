// src/orders/orders.module.ts

import { Module, forwardRef } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CartModule } from '../cart/cart.module';
import { MidtransModule } from '../midtrans/midtrans.module';
import { PaypalModule } from '../paypal/paypal.module';
import { PrismaModule } from '../prisma/prisma.module'; // <-- REVISI: Impor PrismaModule
import { PdfModule } from '../pdf/pdf.module';       // <-- REVISI: Impor PdfModule

@Module({
  imports: [
    PrismaModule,     // <-- REVISI: Tambahkan PrismaModule
    PdfModule,        // <-- REVISI: Tambahkan PdfModule
    CartModule,
    MidtransModule,
    forwardRef(() => PaypalModule), // forwardRef tetap dipertahankan jika ada circular dependency
  ],
  controllers: [OrdersController],
  providers: [OrdersService], // <-- REVISI: Hapus PrismaService dari sini
  exports: [OrdersService],
})
export class OrdersModule {}
import { Module, forwardRef } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CartModule } from '../cart/cart.module';
import { MidtransModule } from '../midtrans/midtrans.module';
import { PaypalModule } from '../paypal/paypal.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PdfModule } from '../pdf/pdf.module';
// --- 1. IMPORT DISCOUNTSMODULE ---
import { DiscountsModule } from '../discounts/discounts.module';

@Module({
  imports: [
    PrismaModule,
    PdfModule,
    CartModule,
    MidtransModule,
    forwardRef(() => PaypalModule),
    // --- 2. TAMBAHKAN DISCOUNTSMODULE DI SINI ---
    DiscountsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
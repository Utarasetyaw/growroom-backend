import { Module, forwardRef } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CartModule } from '../cart/cart.module';
import { MidtransModule } from '../midtrans/midtrans.module';
import { PaypalModule } from '../paypal/paypal.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PdfModule } from '../pdf/pdf.module';

@Module({
  imports: [
    PrismaModule,
    PdfModule,
    CartModule,
    MidtransModule,
    // Gunakan forwardRef() untuk mengatasi circular dependency
    // Ini memberitahu NestJS untuk me-resolve PaypalModule nanti,
    // setelah semua modul lain dimuat.
    forwardRef(() => PaypalModule),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}

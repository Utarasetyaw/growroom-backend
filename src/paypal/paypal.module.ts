import { Module, forwardRef } from '@nestjs/common';
import { PaypalController } from './paypal.controller';
import { PaypalService } from './paypal.service';
import { PrismaModule } from '../prisma/prisma.module'; // <-- 1. Gunakan PrismaModule
import { OrdersModule } from '../orders/orders.module';
import { DiscountsModule } from '../discounts/discounts.module'; // <-- 2. Import DiscountsModule

@Module({
  imports: [
    PrismaModule, // <-- 3. Import PrismaModule di sini
    forwardRef(() => OrdersModule),
    DiscountsModule, // <-- 4. Tambahkan DiscountsModule di sini
  ],
  controllers: [PaypalController],
  // Hapus PrismaService dari providers karena sudah di-supply oleh PrismaModule
  providers: [PaypalService], 
  exports: [PaypalService],
})
export class PaypalModule {}
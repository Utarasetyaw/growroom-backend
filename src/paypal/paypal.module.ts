import { Module, forwardRef } from '@nestjs/common';
import { PaypalController } from './paypal.controller';
import { PaypalService } from './paypal.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    // Gunakan forwardRef() di sini juga untuk mengatasi circular dependency
    // PaypalModule membutuhkan OrdersModule (dan servicenya),
    // dan sebaliknya.
    forwardRef(() => OrdersModule),
  ],
  controllers: [PaypalController],
  // PrismaService tidak perlu diimpor dari PrismaModule karena sudah disediakan di sini.
  // Jika Anda memiliki PrismaModule yang mengekspor PrismaService, Anda bisa mengimpornya.
  providers: [PaypalService, PrismaService],
  exports: [PaypalService],
})
export class PaypalModule {}

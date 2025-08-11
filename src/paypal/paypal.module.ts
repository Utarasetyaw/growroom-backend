import { Module } from '@nestjs/common';
import { PaypalController } from './paypal.controller';
import { PaypalService } from './paypal.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersModule } from '../orders/orders.module'; // 1. Impor OrdersModule

@Module({
  imports: [OrdersModule], // 2. Daftarkan OrdersModule di sini
  controllers: [PaypalController],
  providers: [PaypalService, PrismaService],
})
export class PaypalModule {}
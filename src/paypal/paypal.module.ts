// src/paypal/paypal.module.ts
import { Module, forwardRef } from '@nestjs/common';
import { PaypalController } from './paypal.controller';
import { PaypalService } from './paypal.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersModule } from '../orders/orders.module';

@Module({
  imports: [
    forwardRef(() => OrdersModule),
  ],
  controllers: [PaypalController],
  providers: [PaypalService, PrismaService],
  exports: [PaypalService],
})
export class PaypalModule {}
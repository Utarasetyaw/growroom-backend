import { Module } from '@nestjs/common';
import { MidtransService } from './midtrans.service';
import { MidtransController } from './midtrans.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { DiscountsModule } from '../discounts/discounts.module'; // <-- TAMBAHKAN IMPORT INI

@Module({
  imports: [
    PrismaModule,
    DiscountsModule, // <-- TAMBAHKAN DI SINI
  ],
  controllers: [MidtransController],
  providers: [MidtransService],
  exports: [MidtransService],
})
export class MidtransModule {}
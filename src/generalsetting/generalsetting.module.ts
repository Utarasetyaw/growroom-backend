import { Module } from '@nestjs/common';
import { GeneralsettingService } from './generalsetting.service';
import { GeneralsettingController } from './generalsetting.controller';
import { PrismaService } from '../prisma/prisma.service';
// 1. Impor modul yang dibutuhkan
import { PaymentmethodModule } from '../paymentmethod/paymentmethod.module';

@Module({
  // 2. Daftarkan PaymentmethodModule di array 'imports'
  imports: [PaymentmethodModule],
  controllers: [GeneralsettingController],
  providers: [GeneralsettingService, PrismaService],
  exports: [GeneralsettingService],
})
export class GeneralsettingModule {}
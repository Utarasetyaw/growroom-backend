import { Module } from '@nestjs/common';
import { PaymentmethodController } from './paymentmethod.controller';
import { PaymentmethodService } from './paymentmethod.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [PaymentmethodController],
  providers: [PaymentmethodService, PrismaService],
})
export class PaymentmethodModule {}

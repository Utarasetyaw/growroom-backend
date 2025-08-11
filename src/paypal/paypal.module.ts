import { Module } from '@nestjs/common';
import { PaypalController } from './paypal.controller';
import { PaypalService } from './paypal.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [PaypalController],
  providers: [PaypalService, PrismaService],
})
export class PaypalModule {}
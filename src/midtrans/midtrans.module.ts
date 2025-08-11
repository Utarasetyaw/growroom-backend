import { Module } from '@nestjs/common';
import { MidtransController } from './midtrans.controller';
import { MidtransService } from './midtrans.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [MidtransController],
  providers: [MidtransService, PrismaService],
})
export class MidtransModule {}
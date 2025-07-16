import { Module } from '@nestjs/common';
import { ShippingRateController } from './shipping-rate.controller';
import { ShippingRateService } from './shipping-rate.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ShippingRateController],
  providers: [ShippingRateService, PrismaService],
  exports: [ShippingRateService],
})
export class ShippingRateModule {}

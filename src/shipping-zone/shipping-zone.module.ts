import { Module } from '@nestjs/common';
import { ShippingZoneController } from './shipping-zone.controller';
import { ShippingZoneService } from './shipping-zone.service';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ShippingZoneController],
  providers: [ShippingZoneService, PrismaService],
  exports: [ShippingZoneService],
})
export class ShippingZoneModule {}

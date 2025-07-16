// src/shipping-zone/shipping-zone.module.ts
import { Module } from '@nestjs/common';
import { ShippingZoneService } from './shipping-zone.service';
import { ShippingZoneController } from './shipping-zone.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ShippingZoneController],
  providers: [ShippingZoneService, PrismaService],
  exports: [ShippingZoneService],
})
export class ShippingZoneModule {}

// src/shipping-provider/shipping-provider.module.ts
import { Module } from '@nestjs/common';
import { ShippingProviderService } from './shipping-provider.service';
import { ShippingProviderController } from './shipping-provider.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [ShippingProviderController],
  providers: [ShippingProviderService, PrismaService],
  exports: [ShippingProviderService],
})
export class ShippingProviderModule {}

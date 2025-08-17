import { Module } from '@nestjs/common';
import { ShippingZoneController } from './shipping-zone.controller';
import { ShippingZoneService } from './shipping-zone.service';
import { PrismaModule } from '../prisma/prisma.module'; // Impor PrismaModule

@Module({
  imports: [PrismaModule], // Gunakan PrismaModule di sini
  controllers: [ShippingZoneController],
  providers: [ShippingZoneService], // Hapus PrismaService dari sini
  exports: [ShippingZoneService],
})
export class ShippingZoneModule {}
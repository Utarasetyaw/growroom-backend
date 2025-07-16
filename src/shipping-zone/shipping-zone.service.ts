import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShippingZoneDto } from './dto/create-shipping-zone.dto';
import { UpdateShippingZoneDto } from './dto/update-shipping-zone.dto';

@Injectable()
export class ShippingZoneService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.shippingZone.findMany({
      orderBy: { createdAt: 'desc' },
      include: { rates: true }
    });
  }

  async findOne(id: number) {
    const zone = await this.prisma.shippingZone.findUnique({
      where: { id },
      include: { rates: true }
    });
    if (!zone) throw new NotFoundException('Shipping zone not found');
    return zone;
  }

  create(data: CreateShippingZoneDto) {
    return this.prisma.shippingZone.create({ data });
  }

  async update(id: number, data: UpdateShippingZoneDto) {
    await this.findOne(id); // Pastikan ada
    return this.prisma.shippingZone.update({ where: { id }, data });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.shippingZone.delete({ where: { id } });
  }
}

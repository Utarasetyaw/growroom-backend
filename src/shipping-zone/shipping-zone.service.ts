import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShippingZoneDto } from './dto/create-shipping-zone.dto';
import { UpdateShippingZoneDto } from './dto/update-shipping-zone.dto';

@Injectable()
export class ShippingZoneService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateShippingZoneDto) {
    return this.prisma.shippingZone.create({ data: dto });
  }

  async findAll() {
    return this.prisma.shippingZone.findMany({
      include: { rates: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const zone = await this.prisma.shippingZone.findUnique({
      where: { id },
      include: { rates: true },
    });
    if (!zone) throw new NotFoundException('Shipping zone not found');
    return zone;
  }

  async update(id: number, dto: UpdateShippingZoneDto) {
    return this.prisma.shippingZone.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    return this.prisma.shippingZone.delete({ where: { id } });
  }
}

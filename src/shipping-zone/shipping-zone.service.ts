import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShippingZoneDto } from './dto/create-shipping-zone.dto';
import { UpdateShippingZoneDto } from './dto/update-shipping-zone.dto';

@Injectable()
export class ShippingZoneService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.shippingZone.findMany({
      include: { prices: { include: { currency: true } }, rates: true }
    });
  }

  async findOne(id: number) {
    const zone = await this.prisma.shippingZone.findUnique({
      where: { id },
      include: { prices: { include: { currency: true } }, rates: true }
    });
    if (!zone) throw new NotFoundException('Shipping zone not found');
    return zone;
  }

  async create(dto: CreateShippingZoneDto) {
    return this.prisma.shippingZone.create({
      data: {
        name: dto.name,
        prices: {
          create: dto.prices.map(price => ({
            currencyId: price.currencyId,
            price: price.price,
          }))
        }
      },
      include: { prices: true }
    });
  }

  async update(id: number, dto: UpdateShippingZoneDto) {
    await this.findOne(id);
    if (dto.prices) {
      // Hapus semua prices lama, lalu insert yang baru (atau bisa di-update per currency)
      await this.prisma.shippingZonePrice.deleteMany({ where: { zoneId: id } });
      await this.prisma.shippingZonePrice.createMany({
        data: dto.prices.map(price => ({
          zoneId: id,
          currencyId: price.currencyId,
          price: price.price
        }))
      });
    }
    return this.prisma.shippingZone.update({
      where: { id },
      data: {
        name: dto.name
      },
      include: { prices: { include: { currency: true } } }
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.shippingZone.delete({ where: { id } });
  }
}

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShippingZoneDto } from './dto/create-shipping-zone.dto';
import { UpdateShippingZoneDto } from './dto/update-shipping-zone.dto';

@Injectable()
export class ShippingZoneService {
  constructor(private prisma: PrismaService) { }

  async create(dto: CreateShippingZoneDto) {
    // Nested create prices jika ada
    return this.prisma.shippingZone.create({
      data: {
        name: dto.name,
        isActive: dto.isActive ?? true,
        prices: dto.prices
          ? { create: dto.prices.map(p => ({ currencyId: p.currencyId, price: p.price })) }
          : undefined,
      },
      include: { prices: true },
    });
  }

  async findAll() {
    return this.prisma.shippingZone.findMany({
      include: { prices: { include: { currency: true } }, rates: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: number) {
    const data = await this.prisma.shippingZone.findUnique({
      where: { id },
      include: { prices: { include: { currency: true } }, rates: true }
    });
    if (!data) throw new NotFoundException('Shipping Zone not found');
    return data;
  }

  async update(id: number, dto: UpdateShippingZoneDto) {
    // Handle update prices: replace all (hapus lalu create baru)
    let pricesUpdate: { create: { currencyId: number, price: number }[] } | undefined = undefined;

    if (dto.prices) {
      await this.prisma.shippingZonePrice.deleteMany({ where: { shippingZoneId: id } });
      pricesUpdate = { create: dto.prices.map(p => ({ currencyId: p.currencyId, price: p.price })) };
    }

    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (pricesUpdate) updateData.prices = pricesUpdate;

    return this.prisma.shippingZone.update({
      where: { id },
      data: updateData,
      include: { prices: { include: { currency: true } }, rates: true }
    });
  }


  async remove(id: number) {
    return this.prisma.shippingZone.delete({ where: { id } });
  }

   async findAllActive() {
    return this.prisma.shippingZone.findMany({
      where: { isActive: true },
      include: {
        rates: {
          where: { isActive: true },
          // Pastikan Anda menyertakan currency di dalam prices
          include: {
            prices: {
              include: {
                currency: true, // INI BAGIAN PENTINGNYA
              },
            },
          },
        },
      },
      orderBy: { id: 'asc' },
    });
  }
}

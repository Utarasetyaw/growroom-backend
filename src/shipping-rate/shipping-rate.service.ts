import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShippingRateDto } from './dto/create-shipping-rate.dto';
import { UpdateShippingRateDto } from './dto/update-shipping-rate.dto';

@Injectable()
export class ShippingRateService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateShippingRateDto) {
    return this.prisma.shippingRate.create({
      data: {
        city: dto.city,
        isActive: dto.isActive,
        zone: { connect: { id: dto.zoneId } },
        prices: {
          create: dto.prices.map(p => ({
            currencyId: p.currencyId,
            price: p.price,
          })),
        },
      },
      include: { prices: true }
    });
  }

  async findAll() {
    return this.prisma.shippingRate.findMany({
      include: { zone: true, prices: { include: { currency: true } } },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: number) {
    const data = await this.prisma.shippingRate.findUnique({
      where: { id },
      include: { zone: true, prices: { include: { currency: true } } }
    });
    if (!data) throw new NotFoundException('Shipping Rate not found');
    return data;
  }

  async update(id: number, dto: UpdateShippingRateDto) {
    // Update city/isActive
    const updateData: any = {};
    if (dto.city !== undefined) updateData.city = dto.city;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    // Untuk prices (replace all!)
    if (dto.prices) {
      // Hapus semua lalu tambah baru
      await this.prisma.shippingRatePrice.deleteMany({ where: { shippingRateId: id } });
      await this.prisma.shippingRatePrice.createMany({
        data: dto.prices.map(p => ({
          shippingRateId: id,
          currencyId: p.currencyId,
          price: p.price,
        })),
        skipDuplicates: true,
      });
    }

    return this.prisma.shippingRate.update({
      where: { id },
      data: updateData,
      include: { prices: { include: { currency: true } } },
    });
  }

  async remove(id: number) {
    await this.prisma.shippingRatePrice.deleteMany({ where: { shippingRateId: id } });
    return this.prisma.shippingRate.delete({ where: { id } });
  }
}

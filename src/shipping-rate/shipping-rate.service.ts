import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShippingRateDto } from './dto/create-shipping-rate.dto';
import { UpdateShippingRateDto } from './dto/update-shipping-rate.dto';

@Injectable()
export class ShippingRateService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateShippingRateDto) {
    return this.prisma.shippingRate.create({ data: dto });
  }

  async findAll() {
    return this.prisma.shippingRate.findMany({ include: { zone: true }, orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: number) {
    const data = await this.prisma.shippingRate.findUnique({ where: { id }, include: { zone: true } });
    if (!data) throw new NotFoundException('Shipping Rate not found');
    return data;
  }

  async update(id: number, dto: UpdateShippingRateDto) {
    return this.prisma.shippingRate.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    return this.prisma.shippingRate.delete({ where: { id } });
  }
}

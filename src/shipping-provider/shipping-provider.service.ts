// src/shipping-provider/shipping-provider.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShippingProviderDto } from './dto/create-shipping-provider.dto';
import { UpdateShippingProviderDto } from './dto/update-shipping-provider.dto';

@Injectable()
export class ShippingProviderService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.shippingProvider.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async create(dto: CreateShippingProviderDto) {
    // Cek kode unik
    const exist = await this.prisma.shippingProvider.findUnique({ where: { code: dto.code } });
    if (exist) throw new BadRequestException('Code already exists');
    return this.prisma.shippingProvider.create({ data: dto });
  }

  async update(id: number, dto: UpdateShippingProviderDto) {
    const exist = await this.prisma.shippingProvider.findUnique({ where: { id } });
    if (!exist) throw new NotFoundException('ShippingProvider not found');
    return this.prisma.shippingProvider.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: number) {
    const exist = await this.prisma.shippingProvider.findUnique({ where: { id } });
    if (!exist) throw new NotFoundException('ShippingProvider not found');
    return this.prisma.shippingProvider.delete({ where: { id } });
  }
}

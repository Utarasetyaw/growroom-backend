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
      include: { prices: { include: { currency: true } }, zone: true }
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
    // Pastikan rate yang akan diupdate ada
    const rate = await this.prisma.shippingRate.findUnique({ where: { id } });
    if (!rate) {
      throw new NotFoundException(`Shipping Rate with ID ${id} not found.`);
    }

    // Gunakan satu operasi update dengan nested writes untuk atomicity
    return this.prisma.shippingRate.update({
      where: { id },
      data: {
        // Update city dan status jika ada di DTO
        city: dto.city,
        isActive: dto.isActive,
        // Jika ada 'prices' di DTO, hapus yang lama dan buat yang baru
        ...(dto.prices && {
          prices: {
            deleteMany: {}, // Hapus semua harga yang terkait dengan rate ini
            create: dto.prices.map(p => ({
              currencyId: p.currencyId,
              price: p.price,
            })),
          },
        }),
      },
      include: { prices: { include: { currency: true } }, zone: true },
    });
  }

  async remove(id: number) {
    // Gunakan $transaction untuk memastikan relasi terhapus sebelum rate dihapus
    return this.prisma.$transaction(async (tx) => {
      await tx.shippingRatePrice.deleteMany({ where: { shippingRateId: id } });
      return tx.shippingRate.delete({ where: { id } });
    });
  }
}

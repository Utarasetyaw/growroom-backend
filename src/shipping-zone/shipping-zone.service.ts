import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShippingZoneDto } from './dto/create-shipping-zone.dto';
import { UpdateShippingZoneDto } from './dto/update-shipping-zone.dto';

@Injectable()
export class ShippingZoneService {
  constructor(private prisma: PrismaService) { }

  async create(dto: CreateShippingZoneDto) {
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
      include: {
        prices: { include: { currency: true } },
        rates: true // <-- MASALAHNYA DI SINI! Anda hanya mengambil 'rates', bukan 'prices' di dalamnya.
      },
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
    // Pastikan zona yang akan diupdate ada
    const zone = await this.prisma.shippingZone.findUnique({ where: { id } });
    if (!zone) {
      throw new NotFoundException(`Shipping Zone with ID ${id} not found.`);
    }

    // Gunakan satu operasi update dengan nested writes untuk atomicity
    return this.prisma.shippingZone.update({
      where: { id },
      data: {
        // Update nama dan status jika ada di DTO
        name: dto.name,
        isActive: dto.isActive,
        // Jika ada 'prices' di DTO, hapus yang lama dan buat yang baru
        ...(dto.prices && {
          prices: {
            deleteMany: {}, // Hapus semua harga yang terkait dengan zona ini
            create: dto.prices.map(p => ({
              currencyId: p.currencyId,
              price: p.price,
            })),
          },
        }),
      },
      include: { prices: { include: { currency: true } }, rates: true }
    });
  }

  async remove(id: number) {
    // Gunakan $transaction untuk memastikan semua relasi terhapus sebelum zona dihapus
    return this.prisma.$transaction(async (tx) => {
      await tx.shippingZonePrice.deleteMany({ where: { shippingZoneId: id } });
      // Anda mungkin juga perlu menghapus atau menangani 'shipping rates' yang terkait
      await tx.shippingRate.deleteMany({ where: { zoneId: id } });
      return tx.shippingZone.delete({ where: { id } });
    });
  }

  async findAllActive() {
    return this.prisma.shippingZone.findMany({
      where: { isActive: true },
      include: {
        rates: {
          where: { isActive: true },
          include: {
            prices: {
              include: {
                currency: true,
              },
            },
          },
        },
      },
      orderBy: { id: 'asc' },
    });
  }
}

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

  /**
   * REVISI UTAMA DI FUNGSI INI
   * Query sekarang menyertakan semua data relasi yang dibutuhkan frontend.
   */
  async findAll() {
    console.log('Mencoba mengambil data zona pengiriman...'); // Log Awal

    const zones = await this.prisma.shippingZone.findMany({
      include: {
        prices: {
          include: { currency: true }
        },
        rates: {
          include: {
            prices: {
              include: {
                currency: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' }
    });

    // === TAMBAHKAN LOG INI UNTUK DEBUGGING ===
    // Ini akan menampilkan data APA ADANYA dari Prisma di terminal backend Anda
    console.log('Data mentah dari Prisma:', JSON.stringify(zones, null, 2));

    return zones;
  }

  async findOne(id: number) {
    const data = await this.prisma.shippingZone.findUnique({
      where: { id },
      // Terapkan include yang sama di sini untuk konsistensi
      include: {
        prices: { include: { currency: true } },
        rates: {
          include: {
            prices: {
              include: { currency: true }
            }
          }
        }
      }
    });
    if (!data) throw new NotFoundException('Shipping Zone not found');
    return data;
  }

  async update(id: number, dto: UpdateShippingZoneDto) {
    const zone = await this.prisma.shippingZone.findUnique({ where: { id } });
    if (!zone) {
      throw new NotFoundException(`Shipping Zone with ID ${id} not found.`);
    }

    return this.prisma.shippingZone.update({
      where: { id },
      data: {
        name: dto.name,
        isActive: dto.isActive,
        ...(dto.prices && {
          prices: {
            deleteMany: {},
            create: dto.prices.map(p => ({
              currencyId: p.currencyId,
              price: p.price,
            })),
          },
        }),
      },
      // Terapkan include yang sama di sini juga
      include: {
        prices: { include: { currency: true } },
        rates: {
          include: {
            prices: {
              include: { currency: true }
            }
          }
        }
      }
    });
  }

  async remove(id: number) {
    return this.prisma.$transaction(async (tx) => {
      // Hapus harga dari setiap tarif terlebih dahulu
      const rates = await tx.shippingRate.findMany({ where: { zoneId: id } });
      for (const rate of rates) {
        await tx.shippingRatePrice.deleteMany({ where: { shippingRateId: rate.id } });
      }

      // Hapus tarifnya
      await tx.shippingRate.deleteMany({ where: { zoneId: id } });

      // Hapus harga zona
      await tx.shippingZonePrice.deleteMany({ where: { shippingZoneId: id } });

      // Terakhir, hapus zonanya
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
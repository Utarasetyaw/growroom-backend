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
      include: { 
        prices: { include: { currency: true } }, 
        rates: true // Rates akan kosong saat pertama dibuat, jadi 'true' sudah cukup
      },
    });
  }

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

  /**
   * REVISI UTAMA DI FUNGSI INI
   * Query sekarang menyertakan `prices` dari ShippingZone itu sendiri.
   */
  async findAllActive() {
    return this.prisma.shippingZone.findMany({
      where: { isActive: true },
      include: {
        // --- Menyertakan harga di level negara/zona ---
        prices: {
          include: {
            currency: true
          }
        },
        // --- Menyertakan harga di level kota/rate ---
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
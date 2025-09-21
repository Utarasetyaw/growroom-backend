// File: src/currencies/currencies.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCurrencyDto } from './dto/update-currency.dto';

@Injectable()
export class CurrenciesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.currency.findMany({
      orderBy: { isDefault: 'desc' }
    });
  }
  
  findAllActive() {
    return this.prisma.currency.findMany({
      where: { isActive: true },
      orderBy: { isDefault: 'desc' },
    });
  }

  async update(id: number, data: UpdateCurrencyDto) {
    // REVISI 1: Cek dulu apakah mata uangnya ada
    const currencyExists = await this.prisma.currency.findUnique({ where: { id } });
    if (!currencyExists) {
      throw new NotFoundException(`Mata uang dengan ID ${id} tidak ditemukan.`);
    }

    // REVISI 2: Gunakan Transaksi untuk memastikan konsistensi data
    // Ini mencegah bug jika ada dua permintaan yang mengubah default secara bersamaan.
    return this.prisma.$transaction(async (tx) => {
      if (data.isDefault === true) {
        // Set semua mata uang lain menjadi non-default
        await tx.currency.updateMany({
          where: { id: { not: id } },
          data: { isDefault: false },
        });
      }

      // Update mata uang yang dituju
      const updatedCurrency = await tx.currency.update({
        where: { id },
        data: {
          isActive: data.isActive,
          isDefault: data.isDefault,
        },
      });

      return updatedCurrency;
    });
  }
}
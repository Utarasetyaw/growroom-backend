// src/currencies/currencies.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateCurrencyDto } from './dto/update-currency.dto';

@Injectable()
export class CurrenciesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.currency.findMany({
      orderBy: { isDefault: 'desc' }
    });
  }

  async update(id: number, data: UpdateCurrencyDto) {
    // Logic: pastikan hanya isActive/isDefault yang boleh diupdate
    const allowed = ['isActive', 'isDefault'];
    Object.keys(data).forEach(key => {
      if (!allowed.includes(key)) delete data[key];
    });

    if (data.isDefault === true) {
      // Set semua lain jadi false dulu
      await this.prisma.currency.updateMany({
        where: { id: { not: id } },
        data: { isDefault: false }
      });
    }
    return this.prisma.currency.update({ where: { id }, data });
  }
}

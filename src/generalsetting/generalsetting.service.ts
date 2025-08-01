import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateShippingModeDto } from './dto/update-shipping-mode.dto';

@Injectable()
export class GeneralsettingService {
  constructor(private prisma: PrismaService) {}

  async findOne() {
    return this.prisma.generalSetting.findUnique({ where: { id: 1 } });
  }

  async update(data: any) {
    return this.prisma.generalSetting.update({
      where: { id: 1 },
      data,
    });
  }

  // ✅ TAMBAHKAN METODE BARU INI
  async updateShippingMode(dto: UpdateShippingModeDto) {
    return this.prisma.generalSetting.update({
      where: { id: 1 },
      data: {
        shippingMode: dto.shippingMode,
      },
    });
  }
}

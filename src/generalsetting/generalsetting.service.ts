import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateShippingModeDto } from './dto/update-shipping-mode.dto';

@Injectable()
export class GeneralsettingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Mengambil semua data pengaturan umum.
   * Umumnya untuk panel admin.
   */
  async findOne() {
    return this.prisma.generalSetting.findUnique({ where: { id: 1 } });
  }

  /**
   * Mengupdate data pengaturan umum.
   * Umumnya untuk panel admin.
   */
  async update(data: any) {
    return this.prisma.generalSetting.update({
      where: { id: 1 },
      data,
    });
  }

  /**
   * Mengupdate mode pengiriman saja.
   * Umumnya untuk panel admin.
   */
  async updateShippingMode(dto: UpdateShippingModeDto) {
    return this.prisma.generalSetting.update({
      where: { id: 1 },
      data: {
        shippingMode: dto.shippingMode,
      },
    });
  }

  // 👇 METODE BARU UNTUK KEBUTUHAN FRONTEND
  /**
   * Mengambil data pengaturan umum khusus untuk ditampilkan di homepage frontend.
   * Metode ini hanya mengambil field yang diperlukan untuk efisiensi.
   */
  async findForHomepage() {
    return this.prisma.generalSetting.findUnique({
      where: { id: 1 },
      select: {
        shopName: true,
        bannerImageUrl: true,
        bannerVideoUrl: true,
      },
    });
  }
}
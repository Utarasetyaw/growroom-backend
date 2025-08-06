import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateShippingModeDto } from './dto/update-shipping-mode.dto';

@Injectable()
export class GeneralsettingService {
  constructor(private prisma: PrismaService) {}

  // --- Metode untuk Panel Admin ---

  /**
   * Mengambil semua data pengaturan umum untuk panel admin.
   */
  async findOne() {
    return this.prisma.generalSetting.findUnique({ where: { id: 1 } });
  }

  /**
   * Mengupdate data pengaturan umum dari panel admin.
   */
  async update(data: any) {
    // Metode ini sudah generik dan tidak perlu diubah.
    // Secara otomatis akan menangani semua field baru.
    return this.prisma.generalSetting.update({
      where: { id: 1 },
      data,
    });
  }

  /**
   * Mengupdate mode pengiriman saja dari panel admin.
   */
  async updateShippingMode(dto: UpdateShippingModeDto) {
    return this.prisma.generalSetting.update({
      where: { id: 1 },
      data: {
        shippingMode: dto.shippingMode,
      },
    });
  }

  // --- Metode untuk Frontend ---

  /**
   * Mengambil data spesifik untuk Homepage.
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

  /**
   * Mengambil data spesifik untuk Navigasi dan Footer.
   */
  async findForNavAndFooter() {
    return this.prisma.generalSetting.findUnique({
      where: { id: 1 },
      select: {
        shopName: true,
        shopDescription: true,
        logoUrl: true,
        faviconUrl: true,
        address: true,
        email: true,         // [DITAMBAHKAN]
        phoneNumber: true,   // [DITAMBAHKAN]
        socialMedia: true,
      },
    });
  }
}
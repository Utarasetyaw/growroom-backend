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
   * Menggunakan upsert untuk menangani kasus jika data belum ada.
   */
  async update(data: any) {
    return this.prisma.generalSetting.upsert({
      where: { id: 1 }, // Mencari data dengan ID 1
      update: data,     // Data untuk diupdate jika record ditemukan
      create: {         // Data untuk dibuat jika record tidak ditemukan
        id: 1,
        ...data,
      },
    });
  }

  /**
   * Mengupdate mode pengiriman saja dari panel admin.
   */
  async updateShippingMode(dto: UpdateShippingModeDto) {
    return this.prisma.generalSetting.upsert({
      where: { id: 1 },
      update: {
        shippingMode: dto.shippingMode,
      },
      create: {
        id: 1,
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
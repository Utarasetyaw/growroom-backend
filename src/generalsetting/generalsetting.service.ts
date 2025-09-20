import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateShippingModeDto } from './dto/update-shipping-mode.dto';
import { PaymentmethodService } from '../paymentmethod/paymentmethod.service';

@Injectable()
export class GeneralsettingService {
  private readonly logger = new Logger(GeneralsettingService.name);

  constructor(
    private prisma: PrismaService,
    private paymentMethodService: PaymentmethodService,
  ) {}

  // --- Metode untuk Panel Admin ---

  async findOne() {
    return this.prisma.generalSetting.findUnique({ where: { id: 1 } });
  }

  async update(data: any) {
    return this.prisma.generalSetting.upsert({
      where: { id: 1 },
      update: data,
      create: {
        id: 1,
        ...data,
      },
    });
  }

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

  async findForNavAndFooter() {
    return this.prisma.generalSetting.findUnique({
      where: { id: 1 },
      select: {
        shopName: true,
        shopDescription: true,
        logoUrl: true,
        faviconUrl: true,
        address: true,
        email: true,
        phoneNumber: true,
        socialMedia: true,
      },
    });
  }

  async findForAboutPage() {
    return this.prisma.generalSetting.findUnique({
      where: { id: 1 },
      select: {
        shopName: true,
        shopDescription: true,
        logoUrl: true,
        faviconUrl: true,
        bannerImageUrl: true,
        bannerVideoUrl: true,
        address: true,
        email: true,
        phoneNumber: true,
        socialMedia: true,
        aboutItems: true,
        faqs: true,
        // --- TAMBAHKAN BARIS INI ---
        shippingPolicy: true,
      },
    });
  }
}
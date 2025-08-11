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
    return this.prisma.generalSetting.upsert({
      where: { id: 1 },
      update: data,
      create: {
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
        email: true,
        phoneNumber: true,
        socialMedia: true,
      },
    });
  }

  /**
   * Mengambil konfigurasi publik yang aman untuk diberikan ke frontend.
   */
  async getPublicConfig() {
    this.logger.log('Fetching public configurations for frontend...');
    
    const activeMethods = await this.paymentMethodService.findAllActive();
    const paypalMethod = activeMethods.find(method => method.code === 'paypal');

    let paypalClientId = null;

    if (paypalMethod && typeof paypalMethod.config === 'object' && paypalMethod.config !== null) {
      paypalClientId = (paypalMethod.config as any).clientId || null;
    }

    if (!paypalClientId) {
      this.logger.warn('Active PayPal payment method with a valid clientId in its config was not found.');
    }

    return { paypalClientId };
  }
}
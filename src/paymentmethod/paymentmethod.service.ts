// src/paymentmethod/paymentmethod.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePaymentmethodDto } from './dto/update-paymentmethod.dto';
import { Prisma } from '@prisma/client'; // <-- Impor Prisma

@Injectable()
export class PaymentmethodService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.paymentMethod.findMany({ orderBy: { id: 'asc' } });
  }

  /**
   * --- METODE UPDATE YANG DIPERBARUI ---
   * Menggabungkan (merge) konfigurasi baru dengan yang lama.
   */
  async update(id: number, data: UpdatePaymentmethodDto) {
    const existingPayment = await this.prisma.paymentMethod.findUnique({
      where: { id },
    });

    if (!existingPayment) {
      throw new NotFoundException('Payment Method not found');
    }

    const updateData: Prisma.PaymentMethodUpdateInput = {
      isActive: data.isActive,
    };

    // Jika ada 'config' baru yang dikirim, gabungkan dengan yang lama
    if (data.config) {
      const existingConfig = (existingPayment.config as object) || {};
      updateData.config = {
        ...existingConfig,
        ...data.config,
      };
    }

    return this.prisma.paymentMethod.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Mengambil metode pembayaran yang aktif dan membersihkan data
   * rahasia agar aman untuk dikirim ke frontend.
   */
  async findAllActive() {
    const methods = await this.prisma.paymentMethod.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });

    // Proses sanitasi untuk frontend
    return methods.map(method => {
      const { config, ...restOfMethod } = method;
      const publicConfig: { [key: string]: string } = {};

      if (config && typeof config === 'object' && config !== null) {
        if (method.code === 'paypal' && (config as any).clientId) {
          publicConfig.clientId = (config as any).clientId;
        }
        if (method.code === 'midtrans' && (config as any).clientKey) {
          publicConfig.clientKey = (config as any).clientKey;
        }
      }

      return {
        ...restOfMethod,
        publicConfig,
      };
    });
  }
}
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePaymentmethodDto } from './dto/update-paymentmethod.dto';

@Injectable()
export class PaymentmethodService {
  constructor(private prisma: PrismaService) {}

  // Metode untuk admin (tidak berubah)
  async findAll() {
    return this.prisma.paymentMethod.findMany({ orderBy: { id: 'asc' } });
  }

  // Metode untuk admin (tidak berubah)
  async update(id: number, data: UpdatePaymentmethodDto) {
    const payment = await this.prisma.paymentMethod.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment Method not found');

    return this.prisma.paymentMethod.update({
      where: { id },
      data,
    });
  }

  // REVISI METODE INI
  /**
   * Mengambil semua metode pembayaran yang aktif dan membersihkan data
   * konfigurasi agar aman untuk dikirim ke frontend.
   */
   async findAllActive() {
    const methods = await this.prisma.paymentMethod.findMany({
      where: { isActive: true },
      orderBy: { id: 'asc' },
    });

    // Proses sanitasi: hapus kunci rahasia dan siapkan publicConfig
    return methods.map(method => {
      // Hapus properti 'config' dari objek asli untuk keamanan
      const { config, ...restOfMethod } = method;
      const publicConfig: { [key: string]: string } = {};

      // Ambil hanya key yang aman untuk publik dari objek config asli
      if (config && typeof config === 'object' && config !== null) {
        if (method.code === 'paypal' && (config as any).clientId) {
          publicConfig.clientId = (config as any).clientId;
        }
        // Anda bisa tambahkan key publik lain di sini jika ada,
        // contohnya clientKey untuk Midtrans
        if (method.code === 'midtrans' && (config as any).clientKey) {
            publicConfig.clientKey = (config as any).clientKey;
        }
      }
      
      // Kembalikan objek yang aman untuk frontend
      return {
        ...restOfMethod,
        publicConfig, // Ganti 'config' asli dengan 'publicConfig' yang sudah disaring
      };
    });
  }
}
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { DiscountType } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class DiscountsService {
  constructor(private prisma: PrismaService) {}

  async create(createDiscountDto: CreateDiscountDto) {
    const {
      productIds,
      voucherQuantity,
      voucherCodePrefix,
      voucherMaxUses,
      ...discountData
    } = createDiscountDto;

    return this.prisma.$transaction(async (tx) => {
      // 1. Buat data diskon utama dan hubungkan dengan produk
      const discount = await tx.discount.create({
        data: {
          ...discountData,
          products: {
            connect: productIds.map((id) => ({ id })),
          },
        },
      });

      // 2. Jika tipenya VOUCHER, generate kode voucher unik
      if (discount.type === DiscountType.VOUCHER) {
        const vouchersToCreate: { code: string; maxUses: number | null; discountId: number }[] = [];
        for (let i = 0; i < (voucherQuantity ?? 0); i++) {
          // Generate kode unik: PREFIX-XXXXXX
          const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
          const code = `${voucherCodePrefix || 'VCR'}-${randomPart}`;
          
          vouchersToCreate.push({
            code,
            maxUses: voucherMaxUses ?? null,
            discountId: discount.id,
          });
        }
        await tx.voucher.createMany({
          data: vouchersToCreate,
        });
      }

      // 3. Ambil kembali data lengkap untuk dikembalikan
      return tx.discount.findUnique({
        where: { id: discount.id },
        include: { products: true, vouchers: true },
      });
    });
  }

  findAll() {
    return this.prisma.discount.findMany({
      include: {
        _count: {
          select: { products: true, vouchers: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: number) {
    return this.prisma.discount.findUnique({
      where: { id },
      include: { products: true, vouchers: true },
    });
  }

  async update(id: number, updateDiscountDto: UpdateDiscountDto) {
    const { productIds, ...discountData } = updateDiscountDto;

    const updatedDiscount = await this.prisma.discount.update({
      where: { id },
      data: {
        ...discountData,
        products: productIds
          ? { set: productIds.map((id) => ({ id })) }
          : undefined,
      },
      include: { products: true, vouchers: true },
    });
    return updatedDiscount;
  }

  async remove(id: number) {
     // Hapus dulu semua voucher yang terhubung untuk menghindari error relasi
    await this.prisma.voucher.deleteMany({
      where: { discountId: id },
    });
    
    // Baru hapus diskonnya
    return this.prisma.discount.delete({
      where: { id },
    });
  }
}
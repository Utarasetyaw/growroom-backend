import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { DiscountType } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class DiscountsService {
  private readonly logger = new Logger(DiscountsService.name);

  constructor(private prisma: PrismaService) {}

  private async checkForSaleOverlaps(
    productIds: number[],
    startDate: Date,
    endDate: Date,
    discountIdToExclude?: number,
  ) {
    // --- LOG DITAMBAHKAN DI SINI ---
    this.logger.log('Memeriksa tumpang tindih promo SALE...');
    console.log({ productIds, startDate, endDate, discountIdToExclude });
    // --------------------------------
    
    const whereClause: any = {
      type: DiscountType.SALE,
      startDate: { lte: endDate },
      endDate: { gte: startDate },
    };

    if (discountIdToExclude) {
      whereClause.id = { not: discountIdToExclude };
    }

    const conflictingProduct = await this.prisma.product.findFirst({
      where: {
        id: { in: productIds },
        discounts: {
          some: whereClause,
        },
      },
      include: {
        discounts: {
            where: whereClause,
            select: { name: true }
        }
      }
    });

    if (conflictingProduct) {
      const productName = (conflictingProduct.name as any)?.en || 'produk yang dipilih';
      const conflictingDiscountName = conflictingProduct.discounts[0]?.name || 'lain';
      throw new BadRequestException(
        `Produk "${productName}" sudah dalam diskon "${conflictingDiscountName}". Silakan edit promo yang sudah ada atau pilih produk lain.`,
      );
    }
    this.logger.log('Tidak ditemukan tumpang tindih.');
  }

  async create(createDiscountDto: CreateDiscountDto) {
    // --- LOG DITAMBAHKAN DI SINI ---
    this.logger.log('Memulai proses `create` di service...');
    console.log('Data yang diterima service:', createDiscountDto);
    // --------------------------------
    
    try {
        const {
            productIds,
            voucherQuantity,
            voucherCodePrefix,
            voucherMaxUses,
            ...discountData
          } = createDiscountDto;
      
          if (discountData.type === DiscountType.SALE) {
            await this.checkForSaleOverlaps(
              productIds,
              discountData.startDate,
              discountData.endDate,
            );
          }
      
          return this.prisma.$transaction(async (tx) => {
            this.logger.log('Membuat data diskon utama di database...');
            const discount = await tx.discount.create({
              data: {
                ...discountData,
                products: {
                  connect: productIds.map((id) => ({ id })),
                },
              },
            });
            this.logger.log(`Diskon #${discount.id} berhasil dibuat.`);
      
            if (discount.type === DiscountType.VOUCHER && voucherQuantity) {
              this.logger.log(`Membuat ${voucherQuantity} voucher...`);
              const vouchersToCreate: import('@prisma/client').Prisma.VoucherCreateManyInput[] = [];
              for (let i = 0; i < voucherQuantity; i++) {
                const randomPart = crypto.randomBytes(3).toString('hex').toUpperCase();
                const code = `${voucherCodePrefix || 'VCR'}-${randomPart}`;
                
                vouchersToCreate.push({
                  code,
                  maxUses: voucherMaxUses,
                  discountId: discount.id,
                });
              }
              if (vouchersToCreate.length > 0) {
                  await tx.voucher.createMany({
                      data: vouchersToCreate,
                  });
              }
              this.logger.log('Voucher berhasil dibuat.');
            }
      
            return tx.discount.findUnique({
              where: { id: discount.id },
              include: { products: true, vouchers: true },
            });
          });
    } catch (error) {
        // --- LOG ERROR DETAIL ---
        this.logger.error('Terjadi error saat membuat diskon:', error.stack);
        // Lempar kembali error agar NestJS bisa mengirim respons HTTP yang sesuai
        throw error;
    }
  }

  // ... (Sisa file tidak perlu diubah, karena fokus kita di fungsi 'create')
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

    if (discountData.type === DiscountType.SALE || (productIds && discountData.type === undefined)) {
      const existingDiscount = await this.prisma.discount.findUnique({ where: { id }, include: { products: { select: { id: true }} } });
      if (existingDiscount) {
        const checkProductIds = productIds || existingDiscount.products.map(p => p.id);
        const checkStartDate = discountData.startDate || existingDiscount.startDate;
        const checkEndDate = discountData.endDate || existingDiscount.endDate;
        
        if(checkProductIds.length > 0) {
            await this.checkForSaleOverlaps(
                checkProductIds,
                checkStartDate,
                checkEndDate,
                id, 
            );
        }
      }
    }

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
    await this.prisma.voucher.deleteMany({
      where: { discountId: id },
    });
    
    return this.prisma.discount.delete({
      where: { id },
    });
  }
}
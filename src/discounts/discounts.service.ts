import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { DiscountType } from '@prisma/client';
import * as crypto from 'crypto';
import { ValidateVoucherDto } from './dto/validate-voucher.dto';

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
    this.logger.log('Memeriksa tumpang tindih promo SALE...');
    
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
  }

  async create(createDiscountDto: CreateDiscountDto) {
    this.logger.log('Memulai proses `create` di service...');
    
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
            const discount = await tx.discount.create({
              data: {
                ...discountData,
                products: {
                  connect: productIds.map((id) => ({ id })),
                },
              },
            });
      
            if (discount.type === DiscountType.VOUCHER && voucherQuantity) {
              const vouchersToCreate: { code: string; maxUses?: number; discountId: number }[] = [];
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
            }
      
            return tx.discount.findUnique({
              where: { id: discount.id },
              include: { products: true, vouchers: true },
            });
          });
    } catch (error) {
        this.logger.error('Terjadi error saat membuat diskon:', error.stack);
        throw error;
    }
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

  async validateVoucher(userId: number, dto: ValidateVoucherDto) {
    const { voucherCode, cartItems } = dto;
    const now = new Date();

    const voucher = await this.prisma.voucher.findUnique({
      where: { code: voucherCode },
      include: {
        discount: {
          include: {
            products: { select: { id: true } },
          },
        },
      },
    });

    if (!voucher || !voucher.isActive || !voucher.discount.isActive) {
      throw new BadRequestException('Voucher tidak valid atau sudah tidak aktif.');
    }

    if (now < voucher.discount.startDate || now > voucher.discount.endDate) {
      throw new BadRequestException('Voucher sudah kedaluwarsa atau belum berlaku.');
    }

    if (voucher.maxUses !== null && voucher.usesCount >= voucher.maxUses) {
      throw new BadRequestException('Voucher sudah mencapai batas penggunaan total.');
    }

    if (voucher.discount.maxUsesPerUser !== null) {
      const userUsageCount = await this.prisma.voucherUsage.count({
        where: {
          userId: userId,
          voucher: { discountId: voucher.discountId },
        },
      });
      if (userUsageCount >= voucher.discount.maxUsesPerUser) {
        throw new BadRequestException('Anda sudah mencapai batas penggunaan untuk promo ini.');
      }
    }

    const discountProductIds = voucher.discount.products.map(p => p.id);
    const cartProductIds = cartItems.map(item => item.productId);
    
    const isProductMatch = cartProductIds.some(cartProductId => 
      discountProductIds.includes(cartProductId)
    );

    if (!isProductMatch) {
      throw new BadRequestException('Voucher tidak berlaku untuk produk di keranjang Anda.');
    }

    this.logger.log(`Voucher "${voucherCode}" berhasil divalidasi untuk user #${userId}`);
    return {
      message: 'Voucher berhasil diterapkan!',
      discount: {
        name: voucher.discount.name,
        type: voucher.discount.discountType,
        value: voucher.discount.value,
        applicableProductIds: discountProductIds,
      },
    };
  }
}
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { UpdateDiscountDto } from './dto/update-discount.dto';
import { DiscountType, DiscountValueType, Prisma } from '@prisma/client';
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
    
    const { productIds, ...discountData } = createDiscountDto;

    if (discountData.type === DiscountType.SALE) {
      await this.checkForSaleOverlaps(
        productIds,
        discountData.startDate,
        discountData.endDate,
      );
    }

    if (discountData.type === DiscountType.VOUCHER) {
        if (!discountData.voucherCode) {
            throw new BadRequestException('Kode voucher wajib diisi untuk tipe diskon VOUCHER.');
        }
        const existingVoucher = await this.prisma.discount.findUnique({
            where: { voucherCode: discountData.voucherCode }
        });
        if (existingVoucher) {
            throw new BadRequestException(`Kode voucher "${discountData.voucherCode}" sudah digunakan.`);
        }
    }

    if (discountData.discountType === DiscountValueType.FIXED) {
      const allCurrencies = await this.prisma.currency.findMany();
      const processedValue = {};

      for (const currency of allCurrencies) {
        if (currency.isActive) {
          processedValue[currency.code] = discountData.value[currency.code] || 0;
        } else {
          processedValue[currency.code] = 0;
        }
      }
      discountData.value = processedValue;
    }

    try {
        const discount = await this.prisma.discount.create({
          data: {
            ...discountData,
            products: {
              connect: productIds.map((id) => ({ id })),
            },
          },
          include: {
            products: { select: { id: true, name: true, variant: true } },
          },
        });
        return discount;
    } catch (error) {
        this.logger.error('Terjadi error saat membuat diskon:', error.stack);
        if (error.code === 'P2002' && error.meta?.target?.includes('voucherCode')) {
             throw new BadRequestException(`Kode voucher "${discountData.voucherCode}" sudah digunakan.`);
        }
        throw error;
    }
  }

  findAll() {
    return this.prisma.discount.findMany({
      include: {
        _count: {
          select: { products: true, voucherUsages: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const discount = await this.prisma.discount.findUnique({
      where: { id },
      include: { 
        products: {
            select: {
                id: true,
                name: true,
                variant: true,
                images: {
                    take: 1,
                    select: { url: true }
                }
            }
        }
      },
    });

    if (!discount) {
        throw new NotFoundException(`Diskon dengan ID ${id} tidak ditemukan.`);
    }
    return discount;
  }
  
  async update(id: number, updateDiscountDto: UpdateDiscountDto) {
    const { productIds, ...discountData } = updateDiscountDto;

    const existingDiscount = await this.prisma.discount.findUnique({ 
        where: { id },
        include: { products: { select: { id: true }} } 
    });

    if (!existingDiscount) {
        throw new NotFoundException(`Diskon dengan ID ${id} tidak ditemukan.`);
    }
    
    const typeToCheck = discountData.type || existingDiscount.type;
    if (typeToCheck === DiscountType.SALE) {
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
    
    if (discountData.voucherCode && discountData.voucherCode !== existingDiscount.voucherCode) {
        const anotherDiscountWithCode = await this.prisma.discount.findUnique({
            where: { voucherCode: discountData.voucherCode }
        });
        if (anotherDiscountWithCode && anotherDiscountWithCode.id !== id) {
            throw new BadRequestException(`Kode voucher "${discountData.voucherCode}" sudah digunakan oleh promo lain.`);
        }
    }

    if (discountData.value && (discountData.discountType === DiscountValueType.FIXED || (!discountData.discountType && existingDiscount.discountType === DiscountValueType.FIXED))) {
      const allCurrencies = await this.prisma.currency.findMany();
      const processedValue = { ...existingDiscount.value as object };

      for (const currency of allCurrencies) {
        if (currency.isActive) {
          if (discountData.value[currency.code] !== undefined) {
             processedValue[currency.code] = discountData.value[currency.code] || 0;
          }
        } else {
          processedValue[currency.code] = 0;
        }
      }
      discountData.value = processedValue;
    }

    const updatedDiscount = await this.prisma.discount.update({
      where: { id },
      data: {
        ...discountData,
        products: productIds
          ? { set: productIds.map((id) => ({ id })) }
          : undefined,
      },
      include: { products: true },
    });
    return updatedDiscount;
  }

  async remove(id: number) {
    return this.prisma.discount.delete({
      where: { id },
    });
  }

  async markVoucherAsUsedForOrder(
    orderId: number,
    userId: number,
    tx?: Prisma.TransactionClient
  ) {
    const prismaClient = tx || this.prisma;
    this.logger.log(`Mencoba menandai voucher untuk Order #${orderId} sebagai terpakai...`);

    const existingUsage = await prismaClient.voucherUsage.findUnique({
      where: { orderId },
    });

    if (existingUsage) {
      this.logger.warn(`Voucher untuk Order #${orderId} sudah pernah ditandai. Proses dilewati.`);
      return;
    }

    const appliedVoucher = await prismaClient.appliedDiscount.findFirst({
      where: {
        orderId: orderId,
        discountType: DiscountType.VOUCHER,
      },
    });

    if (appliedVoucher) {
      this.logger.log(`Voucher "${appliedVoucher.discountName}" ditemukan pada Order #${orderId}. Memproses...`);
      
      await prismaClient.discount.update({
        where: { id: appliedVoucher.discountId },
        data: { usesCount: { increment: 1 } },
      });

      await prismaClient.voucherUsage.create({
        data: {
          userId: userId,
          discountId: appliedVoucher.discountId,
          orderId: orderId,
        },
      });

      this.logger.log(`Voucher untuk Order #${orderId} berhasil ditandai sebagai terpakai.`);
    } else {
      this.logger.log(`Tidak ada voucher yang diterapkan pada Order #${orderId}. Tidak ada tindakan.`);
    }
  }

  async validateVoucher(userId: number, dto: ValidateVoucherDto) {
    const { voucherCode, cartItems } = dto;
    const now = new Date();

    const discount = await this.prisma.discount.findUnique({
      where: { voucherCode: voucherCode },
      include: {
        products: { select: { id: true } },
      },
    });

    if (!discount || discount.type !== 'VOUCHER' || !discount.isActive) {
      throw new BadRequestException('Voucher tidak valid atau sudah tidak aktif.');
    }

    if (now < discount.startDate || now > discount.endDate) {
      throw new BadRequestException('Voucher sudah kedaluwarsa atau belum berlaku.');
    }

    if (discount.maxUses !== null && discount.usesCount >= discount.maxUses) {
      throw new BadRequestException('Voucher sudah mencapai batas penggunaan total.');
    }

    if (discount.maxUsesPerUser !== null) {
      const userUsageCount = await this.prisma.voucherUsage.count({
        where: {
          userId: userId,
          discountId: discount.id,
        },
      });
      if (userUsageCount >= discount.maxUsesPerUser) {
        throw new BadRequestException('Anda sudah mencapai batas penggunaan untuk promo ini.');
      }
    }

    const discountProductIds = discount.products.map(p => p.id);
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
        id: discount.id,
        name: discount.name,
        type: discount.discountType,
        value: discount.value,
        applicableProductIds: discountProductIds,
      },
    };
  }
}
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GetProductsQueryDto } from '../user_frontend/dto/get-products-query.dto';
import * as fs from 'fs';
import { join } from 'path';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  private readonly productInclude = {
    images: {
      orderBy: {
        id: 'asc',
      },
    },
    prices: {
      include: {
        currency: true,
      },
    },
    subCategory: {
      include: {
        category: true,
      },
    },
  } as const;

  /**
   * Fungsi privat untuk membersihkan dan mengkonversi semua tipe data dari DTO.
   * Ini menjadi satu-satunya sumber kebenaran untuk parsing data.
   */
  private cleanDto(dto: any) {
    const cleaned: any = { ...dto };
    try {
      // Konversi field yang seharusnya JSON
      if (cleaned.name) cleaned.name = JSON.parse(cleaned.name);
      if (cleaned.variant) cleaned.variant = JSON.parse(cleaned.variant);
      if (cleaned.description) cleaned.description = JSON.parse(cleaned.description);
      if (cleaned.careDetails) cleaned.careDetails = JSON.parse(cleaned.careDetails);
      if (cleaned.prices) cleaned.prices = JSON.parse(cleaned.prices);

      // Konversi field yang seharusnya Angka (Number)
      if (cleaned.stock !== undefined) cleaned.stock = parseInt(cleaned.stock, 10);
      if (cleaned.subCategoryId !== undefined) cleaned.subCategoryId = parseInt(cleaned.subCategoryId, 10);
      if (cleaned.weight !== undefined) cleaned.weight = cleaned.weight ? parseFloat(cleaned.weight) : null;

      // Konversi field yang seharusnya Boolean
      if (cleaned.isActive !== undefined) cleaned.isActive = String(cleaned.isActive).toLowerCase() === 'true';
      if (cleaned.isBestProduct !== undefined) cleaned.isBestProduct = String(cleaned.isBestProduct).toLowerCase() === 'true';
      
      return cleaned;
    } catch (error) {
      // Jika ada kesalahan parsing JSON, kirim error yang jelas
      throw new BadRequestException('Format JSON tidak valid pada salah satu field.');
    }
  }

  async create(createProductDto: any, imageUrls: string[]) {
    // Panggil fungsi cleanDto di awal
    const cleanedDto = this.cleanDto(createProductDto);
    const { prices, ...productData } = cleanedDto;
    
    return this.prisma.$transaction(async (tx) => {
      const dataToCreate: Prisma.ProductCreateInput = {
        ...productData,
        images: { create: imageUrls.map((url) => ({ url })) },
      };
      if (prices && Array.isArray(prices) && prices.length > 0) {
        dataToCreate.prices = {
          create: prices.map((p: any) => ({ currencyId: p.currencyId, price: p.price })),
        };
      }
      return tx.product.create({ data: dataToCreate, include: this.productInclude });
    });
  }

  async update(id: number, updateProductDto: any, newImageUrls: string[]) {
    // Panggil fungsi cleanDto di awal
    const cleanedDto = this.cleanDto(updateProductDto);
    const { prices, imagesToDelete, ...productData } = cleanedDto;
    
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found.`);
      }
      await tx.product.update({ where: { id }, data: productData });

      if (imagesToDelete) {
        const parsedImagesToDelete = String(imagesToDelete).split(',').map(imgId => parseInt(imgId, 10));
        const imagesToDeleteRecords = await tx.productImage.findMany({ where: { id: { in: parsedImagesToDelete } } });
        for (const image of imagesToDeleteRecords) {
          const orderItemCount = await tx.orderItem.count({ where: { productImage: image.url } });
          if (orderItemCount === 0) {
            const imagePath = join(process.cwd(), image.url.startsWith('/') ? image.url.substring(1) : image.url);
            if (fs.existsSync(imagePath)) {
              try { fs.unlinkSync(imagePath); }
              catch (err) { console.error(`Failed to delete file: ${imagePath}`, err); }
            }
          }
        }
        await tx.productImage.deleteMany({ where: { productId: id, id: { in: parsedImagesToDelete } } });
      }

      if (newImageUrls && newImageUrls.length > 0) {
        await tx.productImage.createMany({ data: newImageUrls.map((url) => ({ url, productId: id })) });
      }

      if (prices) {
        await tx.productPrice.deleteMany({ where: { productId: id } });
        if (Array.isArray(prices) && prices.length > 0) {
          await tx.productPrice.createMany({
            data: prices.map((p: any) => ({ productId: id, currencyId: p.currencyId, price: p.price })),
          });
        }
      }
      return tx.product.findUnique({ where: { id }, include: this.productInclude });
    });
  }
  
  // --- METODE LAINNYA DI BAWAH INI TIDAK ADA PERUBAHAN ---

  async findAll() {
    return this.prisma.product.findMany({
      include: this.productInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: id,
        isActive: true,
      },
      include: this.productInclude,
    });
    if (!product) {
      throw new NotFoundException(`Product with ID #${id} not found or is not active.`);
    }
    return product;
  }
  
  async remove(id: number) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id },
        include: { images: true },
      });
      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found.`);
      }
      if (product.images && product.images.length > 0) {
        for (const image of product.images) {
          const orderItemCount = await tx.orderItem.count({ where: { productImage: image.url } });
          if (orderItemCount === 0) {
            const imagePath = join(process.cwd(), image.url.startsWith('/') ? image.url.substring(1) : image.url);
            if (fs.existsSync(imagePath)) {
              try { fs.unlinkSync(imagePath); }
              catch (err) { console.error(`Failed to delete product file: ${imagePath}`, err); }
            }
          }
        }
      }
      return tx.product.delete({ where: { id } });
    });
  }

  async findBestProducts(limit: number = 8) {
    return this.prisma.product.findMany({
      where: {
        isBestProduct: true,
        isActive: true,
      },
      take: limit,
      include: this.productInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findRelatedProducts(currentProductId: number, subCategoryId: number, limit: number) {
    return this.prisma.product.findMany({
      where: {
        subCategoryId: subCategoryId,
        id: {
          not: currentProductId,
        },
        isActive: true,
      },
      take: limit,
      include: this.productInclude,
    });
  }

  async findPaginated(query: GetProductsQueryDto) {
    const {
      page = 1,
      limit = 12,
      categoryId,
      subCategoryId,
      search,
      variant,
      availability,
      minPrice,
      maxPrice,
      currencyCode,
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
    };

    if (search) {
      where.name = {
        path: ['en'],
        string_contains: search,
      };
    }

    if (subCategoryId) {
      where.subCategoryId = subCategoryId;
    } else if (categoryId) {
      where.subCategory = {
        categoryId: categoryId,
      };
    }

    if (variant) {
      where.variant = {
        path: ['en'],
        string_contains: variant,
      };
    }

    if (availability) {
      if (availability === 'AVAILABLE') {
        where.stock = { gt: 0 };
      } else if (availability === 'OUT_OF_STOCK') {
        where.stock = { equals: 0 };
      }
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      where.prices = {
        some: {
          price: {
            gte: minPrice,
            lte: maxPrice,
          },
          ...(currencyCode && {
            currency: {
              code: currencyCode,
            },
          }),
        },
      };
    }

    const [products, total] = await this.prisma.$transaction([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: this.productInclude,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
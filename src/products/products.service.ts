import { Injectable, NotFoundException } from '@nestjs/common';
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

  async create(createProductDto: any, imageUrls: string[]) {
    // DTO diterima dalam keadaan bersih karena sudah diproses oleh ValidationPipe dan decorator @Transform
    const { prices, ...productData } = createProductDto;
    
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
    // DTO diterima dalam keadaan bersih karena sudah diproses oleh ValidationPipe dan decorator @Transform
    const { prices, imagesToDelete, ...productData } = updateProductDto;
    
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) {
        throw new NotFoundException(`Product with ID #${id} not found.`);
      }
      await tx.product.update({ where: { id }, data: productData });

      if (imagesToDelete && Array.isArray(imagesToDelete) && imagesToDelete.length > 0) {
        const imagesToDeleteRecords = await tx.productImage.findMany({ where: { id: { in: imagesToDelete } } });
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
        await tx.productImage.deleteMany({ where: { productId: id, id: { in: imagesToDelete } } });
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
        throw new NotFoundException(`Product with ID #${id} not found.`);
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
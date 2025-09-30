import { Injectable, NotFoundException } from '@nestjs/common';
import { DiscountType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GetProductsQueryDto } from '../user_frontend/dto/get-products-query.dto';
import * as fs from 'fs';
import { join } from 'path';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateProductDto } from './dto/create-product.dto';

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
    discounts: {
      where: {
        type: DiscountType.SALE,
        isActive: true,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      orderBy: {
        createdAt: 'desc',
      },
    },
  } as const;

  async create(createProductDto: CreateProductDto, imageUrls: string[]) {
    const { prices, ...productData } = createProductDto as any;

    return this.prisma.$transaction(async (tx) => {
      const dataToCreate: Prisma.ProductCreateInput = {
        ...productData,
        images: {
          create: imageUrls.map((url) => ({ url })),
        },
        prices: {
          create:
            prices?.map((p: any) => ({
              currencyId: p.currencyId,
              price: p.price,
            })) || [],
        },
      };

      return tx.product.create({
        data: dataToCreate,
        include: this.productInclude,
      });
    });
  }

  async update(
    id: number,
    updateProductDto: UpdateProductDto,
    newImageUrls: string[],
  ) {
    const { prices, imagesToDelete, ...productData } = updateProductDto as any;

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) {
        throw new NotFoundException(`Produk dengan ID #${id} tidak ditemukan.`);
      }

      await tx.product.update({
        where: { id },
        data: productData,
      });

      if (
        imagesToDelete &&
        Array.isArray(imagesToDelete) &&
        imagesToDelete.length > 0
      ) {
        const imagesToDeleteRecords = await tx.productImage.findMany({
          where: {
            id: { in: imagesToDelete },
            productId: id, // Pastikan hanya menghapus gambar milik produk ini
          },
        });

        for (const image of imagesToDeleteRecords) {
          const imagePath = join(
            process.cwd(),
            image.url.startsWith('/') ? image.url.substring(1) : image.url,
          );
          if (fs.existsSync(imagePath)) {
            try {
              fs.unlinkSync(imagePath);
              console.log(`Successfully deleted file: ${imagePath}`);
            } catch (err) {
              console.error(`Failed to delete file: ${imagePath}`, err);
            }
          }
        }
        await tx.productImage.deleteMany({
          where: {
            id: { in: imagesToDelete },
            productId: id,
          },
        });
      }

      if (newImageUrls && newImageUrls.length > 0) {
        await tx.productImage.createMany({
          data: newImageUrls.map((url) => ({ url, productId: id })),
        });
      }

      if (prices) {
        await tx.productPrice.deleteMany({ where: { productId: id } });
        if (Array.isArray(prices) && prices.length > 0) {
          await tx.productPrice.createMany({
            data: prices.map((p: any) => ({
              productId: id,
              currencyId: p.currencyId,
              price: p.price,
            })),
          });
        }
      }

      return tx.product.findUnique({
        where: { id },
        include: this.productInclude,
      });
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
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: this.productInclude,
    });
    if (!product) {
      throw new NotFoundException(`Produk dengan ID #${id} tidak ditemukan.`);
    }
    return product;
  }

  async findOnePublic(id: number) {
    const product = await this.prisma.product.findFirst({
      where: {
        id: id,
        isActive: true,
      },
      include: this.productInclude,
    });

    if (!product) {
      return null;
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
        throw new NotFoundException(`Produk dengan ID #${id} tidak ditemukan.`);
      }
      if (product.images && product.images.length > 0) {
        for (const image of product.images) {
          const imagePath = join(
            process.cwd(),
            image.url.startsWith('/') ? image.url.substring(1) : image.url,
          );
          if (fs.existsSync(imagePath)) {
            try {
              fs.unlinkSync(imagePath);
            } catch (err) {
              console.error(`Failed to delete product file: ${imagePath}`, err);
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

  async findRelatedProducts(
    currentProductId: number,
    subCategoryId: number,
    limit: number,
  ) {
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
        path: ['en'], // Assuming default search is on 'en'
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
        path: ['en'], // Assuming default search is on 'en'
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

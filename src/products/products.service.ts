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
    images: true,
    prices: {
      include: {
        currency: true,
      },
    },
    subCategory: true,
  };

  // ... (Metode findAll, findOne, create, update, remove, findBestProducts tetap sama) ...
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
      throw new NotFoundException(`Product with ID ${id} not found.`);
    }
    return product;
  }

  async create(createProductDto: any, imageUrls: string[]) {
    const { prices, ...productData } = createProductDto;
    const dataToCreate: Prisma.ProductCreateInput = {
      ...productData,
      images: {
        create: imageUrls.map((url) => ({ url })),
      },
    };

    if (prices && prices.length > 0) {
      const validPrices = prices.filter(
        (p) => p.currencyId != null && p.price != null,
      );
      if (validPrices.length > 0) {
        dataToCreate.prices = {
          create: validPrices,
        };
      }
    }

    return this.prisma.product.create({
      data: dataToCreate,
      include: this.productInclude,
    });
  }

  async update(id: number, updateProductDto: any, newImageUrls: string[]) {
    const { prices, imagesToDelete, ...productData } = updateProductDto;

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found.`);
      }

      if (Object.keys(productData).length > 0) {
        await tx.product.update({
          where: { id },
          data: productData,
        });
      }

      if (imagesToDelete && imagesToDelete.length > 0) {
        const imagesToDeleteRecords = await tx.productImage.findMany({
          where: { id: { in: imagesToDelete } },
        });

        for (const image of imagesToDeleteRecords) {
          const imagePath = join(process.cwd(), image.url.substring(1));
          if (fs.existsSync(imagePath)) {
            try {
              fs.unlinkSync(imagePath);
            } catch (err) {
              console.error(`Failed to delete file: ${imagePath}`, err);
            }
          }
        }

        await tx.productImage.deleteMany({
          where: { productId: id, id: { in: imagesToDelete } },
        });
      }

      if (newImageUrls && newImageUrls.length > 0) {
        await tx.productImage.createMany({
          data: newImageUrls.map((url) => ({ url, productId: id })),
        });
      }

      if (prices) {
        await tx.productPrice.deleteMany({ where: { productId: id } });
        if (prices.length > 0) {
          const validPrices = prices.filter(
            (p) => p.currencyId != null && p.price != null,
          );
          if (validPrices.length > 0) {
            await tx.productPrice.createMany({
              data: validPrices.map((price) => ({
                productId: id,
                currencyId: price.currencyId!,
                price: price.price!,
              })),
            });
          }
        }
      }

      return tx.product.findUnique({
        where: { id },
        include: this.productInclude,
      });
    });
  }

  async remove(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { images: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found.`);
    }

    if (product.images && product.images.length > 0) {
      for (const image of product.images) {
        const imagePath = join(process.cwd(), image.url.substring(1));
        if (fs.existsSync(imagePath)) {
          try {
            fs.unlinkSync(imagePath);
          } catch (err) {
            console.error(`Failed to delete product file: ${imagePath}`, err);
          }
        }
      }
    }

    return this.prisma.product.delete({ where: { id } });
  }

  async findBestProducts(limit: number = 8) {
    return this.prisma.product.findMany({
      where: {
        isBestProduct: true,
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
      currencyCode, // <-- Ambil currencyCode dari query
    } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
    };

    if (search) {
      where.name = {
        path: ['id'],
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
        path: ['id'],
        equals: variant,
      };
    }

    if (availability) {
      if (availability === 'AVAILABLE') {
        where.stock = { gt: 0 };
      } else if (availability === 'OUT_OF_STOCK') {
        where.stock = { equals: 0 };
      }
    }

    // --- PERBAIKAN LOGIKA FILTER HARGA ---
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.prices = {
        some: {
          price: {
            gte: minPrice,
            lte: maxPrice,
          },
          // Tambahkan filter berdasarkan currencyCode jika ada
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

    const totalPages = Math.ceil(total / limit);

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages,
      },
    };
  }
}

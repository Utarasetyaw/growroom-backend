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
        isActive: true, // Frontend users can only see active products
      },
      include: this.productInclude,
    });

    if (!product) {
      throw new NotFoundException(`Product with ID #${id} not found or is not active.`);
    }
    return product;
  }

  async create(createProductDto: any, imageUrls: string[]) {
    const { prices, ...productData } = createProductDto;

    // --- BLOK KONVERSI TIPE DATA (CREATE) ---
    if (productData.isBestProduct !== undefined) {
      productData.isBestProduct = String(productData.isBestProduct).toLowerCase() === 'true';
    }
    if (productData.isActive !== undefined) {
      productData.isActive = String(productData.isActive).toLowerCase() === 'true';
    }
    if (productData.stock !== undefined) {
      productData.stock = parseInt(String(productData.stock), 10);
    }
    if (productData.weight !== undefined) {
      productData.weight = parseFloat(String(productData.weight)) || null;
    }
    if (productData.subCategoryId !== undefined) {
      productData.subCategoryId = parseInt(String(productData.subCategoryId), 10);
    }
    // Parsing JSON string dari field yang relevan
    if (productData.name) productData.name = JSON.parse(productData.name);
    if (productData.variant) productData.variant = JSON.parse(productData.variant);
    if (productData.description) productData.description = JSON.parse(productData.description);
    if (productData.careDetails) productData.careDetails = JSON.parse(productData.careDetails);
    
    return this.prisma.$transaction(async (tx) => {
      const dataToCreate: Prisma.ProductCreateInput = {
        ...productData,
        images: {
          create: imageUrls.map((url) => ({ url })),
        },
      };

      const parsedPrices = prices ? JSON.parse(prices) : [];
      if (parsedPrices && parsedPrices.length > 0) {
        const validPrices = parsedPrices
          .filter((p: any) => p.currencyId != null && p.price != null)
          .map((p: any) => ({
            currencyId: parseInt(String(p.currencyId), 10),
            price: parseFloat(String(p.price)),
          }));

        if (validPrices.length > 0) {
          dataToCreate.prices = {
            create: validPrices,
          };
        }
      }

      return tx.product.create({
        data: dataToCreate,
        include: this.productInclude,
      });
    });
  }

 async update(id: number, updateProductDto: any, newImageUrls: string[]) {
    // DTO yang diterima di sini sudah di-parsing oleh controller
    const { prices, imagesToDelete, ...productData } = updateProductDto;

    // Blok konversi tipe data ini tetap diperlukan
    if (productData.isBestProduct !== undefined) {
      productData.isBestProduct = String(productData.isBestProduct).toLowerCase() === 'true';
    }
    if (productData.isActive !== undefined) {
      productData.isActive = String(productData.isActive).toLowerCase() === 'true';
    }
    if (productData.stock !== undefined) {
      productData.stock = parseInt(String(productData.stock), 10);
    }
    if (productData.weight !== undefined) {
      productData.weight = parseFloat(String(productData.weight)) || null;
    }
    if (productData.subCategoryId !== undefined) {
      productData.subCategoryId = parseInt(String(productData.subCategoryId), 10);
    }
    // Field JSON sudah di-handle di controller, jadi tidak perlu parse lagi di sini
    
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found.`);
      }

      // Update data produk dasar
      await tx.product.update({
        where: { id },
        data: productData,
      });

      // Logika untuk menghapus gambar (tidak berubah)
      if (imagesToDelete) {
        const parsedImagesToDelete = String(imagesToDelete).split(',').map(imgId => parseInt(imgId, 10));
        const imagesToDeleteRecords = await tx.productImage.findMany({
          where: { id: { in: parsedImagesToDelete } },
        });

        for (const image of imagesToDeleteRecords) {
          const orderItemCount = await tx.orderItem.count({
            where: { productImage: image.url },
          });

          if (orderItemCount === 0) {
            const imagePath = join(process.cwd(), image.url.startsWith('/') ? image.url.substring(1) : image.url);
            if (fs.existsSync(imagePath)) {
              try {
                fs.unlinkSync(imagePath);
              } catch (err) {
                console.error(`Failed to delete file: ${imagePath}`, err);
              }
            }
          }
        }
        await tx.productImage.deleteMany({
          where: { productId: id, id: { in: parsedImagesToDelete } },
        });
      }

      // Logika untuk menambah gambar baru (tidak berubah)
      if (newImageUrls && newImageUrls.length > 0) {
        await tx.productImage.createMany({
          data: newImageUrls.map((url) => ({ url, productId: id })),
        });
      }

      // --- PERBAIKAN UTAMA DI SINI ---
      if (prices) {
        // Hapus harga lama
        await tx.productPrice.deleteMany({ where: { productId: id } });

        // Langsung gunakan variabel 'prices', tidak perlu parse lagi
        const parsedPrices = prices; 
        
        if (parsedPrices && parsedPrices.length > 0) {
          const validPrices = parsedPrices
            .filter((p: any) => p.currencyId != null && p.price != null)
            .map((p: any) => ({
                productId: id,
                currencyId: parseInt(String(p.currencyId), 10),
                price: parseFloat(String(p.price)),
              }));
            
          if (validPrices.length > 0) {
            // Buat harga baru
            await tx.productPrice.createMany({
              data: validPrices,
            });
          }
        }
      }

      // Ambil dan kembalikan data produk yang sudah terupdate
      return tx.product.findUnique({
        where: { id },
        include: this.productInclude,
      });
    });
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
          const orderItemCount = await tx.orderItem.count({
            where: { productImage: image.url },
          });

          if (orderItemCount === 0) {
            const imagePath = join(process.cwd(), image.url.startsWith('/') ? image.url.substring(1) : image.url);
            if (fs.existsSync(imagePath)) {
              try {
                fs.unlinkSync(imagePath);
              } catch (err) {
                console.error(`Failed to delete product file: ${imagePath}`, err);
              }
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
        path: ['en'], // Sesuaikan dengan key JSON Anda, misal 'en' atau 'id'
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
        path: ['en'], // Sesuaikan dengan key JSON Anda
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
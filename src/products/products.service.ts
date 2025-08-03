import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { GetProductsQueryDto } from '../user_frontend/dto/get-products-query.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Mendefinisikan relasi yang akan disertakan dalam query produk.
   * Digunakan kembali di beberapa metode untuk konsistensi.
   */
  private readonly productInclude = {
    images: true,
    prices: {
      include: {
        currency: true,
      },
    },
    subCategory: true,
  };

  /**
   * Mengambil semua produk. Umumnya untuk panel admin.
   */
  async findAll() {
    return this.prisma.product.findMany({
      include: this.productInclude,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Mengambil satu produk berdasarkan ID.
   */
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

  /**
   * Membuat produk baru.
   */
  async create(createProductDto: any, imageUrls: string[]) {
    const { prices, ...productData } = createProductDto;

    const dataToCreate: Prisma.ProductCreateInput = {
      ...productData,
      images: {
        create: imageUrls.map(url => ({ url })),
      },
    };

    if (prices && prices.length > 0) {
      const validPrices = prices.filter(p => p.currencyId != null && p.price != null);
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

  /**
   * Mengupdate produk yang ada.
   */
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
        await tx.productImage.deleteMany({
          where: { productId: id, id: { in: imagesToDelete } },
        });
      }

      if (newImageUrls && newImageUrls.length > 0) {
        await tx.productImage.createMany({
          data: newImageUrls.map(url => ({ url, productId: id })),
        });
      }

      if (prices) {
        await tx.productPrice.deleteMany({ where: { productId: id } });
        if (prices.length > 0) {
          const validPrices = prices.filter(p => p.currencyId != null && p.price != null);
          if (validPrices.length > 0) {
            await tx.productPrice.createMany({
              data: validPrices.map(price => ({
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

  /**
   * Menghapus produk.
   */
  async remove(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found.`);
    }
    return this.prisma.product.delete({ where: { id } });
  }

  /**
   * Mengambil produk yang ditandai sebagai 'Best Product'.
   * @param limit Jumlah maksimal produk yang ingin diambil.
   */
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

  // 👇 METODE BARU UNTUK HALAMAN SEMUA PRODUK (PAGINASI & FILTER)
  /**
   * Mengambil daftar produk dengan paginasi, filter, dan pencarian.
   * @param query DTO yang berisi parameter paginasi dan filter.
   */
  async findPaginated(query: GetProductsQueryDto) {
    const { page = 1, limit = 10, categoryId, subCategoryId, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
    };

    if (search) {
      // Pencarian case-insensitive pada field JSON 'name'
      // Sesuaikan 'path' jika key bahasa default Anda berbeda (misal: 'en')
      where.name = {
        path: ['id'],
        string_contains: search,
        mode: 'insensitive',
      };
    }

    if (subCategoryId) {
      where.subCategoryId = subCategoryId;
    } else if (categoryId) {
      where.subCategory = {
        categoryId: categoryId,
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
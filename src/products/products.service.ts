import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // Gabungan include untuk menghindari duplikasi
  private readonly productInclude = {
    images: true,
    prices: {
      include: {
        currency: true,
      },
    },
    subCategory: true,
  };

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

  async create(createProductDto: CreateProductDto, imageUrls: string[]) {
    const { prices, careDetails, ...productData } = createProductDto;

    return this.prisma.product.create({
      data: {
        ...productData,
        careDetails: careDetails ? JSON.stringify(careDetails) : undefined,
        images: {
          create: imageUrls.map(url => ({ url })),
        },
        prices: {
          create: prices,
        },
      },
      include: this.productInclude,
    });
  }

  async update(id: number, updateProductDto: UpdateProductDto, newImageUrls: string[]) {
    // REVISI: Destructuring DTO untuk memisahkan data relasi
    const { prices, imagesToDelete, ...productData } = updateProductDto;

    // REVISI: Gunakan transaksi untuk memastikan semua operasi berhasil atau dibatalkan bersama-sama.
    // Ini menjaga integritas data jika terjadi error di tengah jalan.
    return this.prisma.$transaction(async (tx) => {
      // 1. Pastikan produk ada di dalam transaksi
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found.`);
      }

      // 2. Update data produk utama jika ada
      if (Object.keys(productData).length > 0) {
        await tx.product.update({
          where: { id },
          data: productData as Prisma.ProductUpdateInput,
        });
      }

      // 3. Hapus gambar lama jika ada ID yang diberikan di `imagesToDelete`
      if (imagesToDelete && imagesToDelete.length > 0) {
        await tx.productImage.deleteMany({
          where: {
            productId: id,
            id: { in: imagesToDelete },
          },
        });
      }

      // 4. Tambahkan gambar baru jika ada file yang di-upload
      if (newImageUrls && newImageUrls.length > 0) {
        await tx.productImage.createMany({
          data: newImageUrls.map(url => ({
            url,
            productId: id,
          })),
        });
      }

      // 5. Update harga (Strategi: Hapus semua harga lama lalu buat yang baru)
      if (prices && prices.length > 0) {
        await tx.productPrice.deleteMany({ where: { productId: id } });
        await tx.productPrice.createMany({
          data: prices
            .filter(price => price.currencyId !== undefined && price.price !== undefined)
            .map(price => ({
              ...price,
              productId: id,
              currencyId: price.currencyId!,
              price: price.price!,
            })),
        });
      }

      // 6. Ambil dan kembalikan data produk terbaru setelah semua perubahan
      return tx.product.findUnique({
        where: { id },
        include: this.productInclude,
      });
    });
  }

  async remove(id: number) {
    // Cek dulu apakah produk ada sebelum mencoba menghapus
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found.`);
    }

    // `onDelete: Cascade` di Prisma schema akan otomatis menghapus
    // ProductImage dan ProductPrice yang berelasi.
    return this.prisma.product.delete({
      where: { id },
    });
  }
}
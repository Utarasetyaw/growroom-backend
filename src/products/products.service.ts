import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

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
    // REVISI: Tambahkan careDetails ke include agar selalu dikembalikan
    careDetails: true, 
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

    const dataToCreate: Prisma.ProductCreateInput = {
      ...productData,
      // REVISI: Langsung berikan objek/array JavaScript, jangan di-stringify.
      // Prisma akan menanganinya secara otomatis untuk tipe data Json.
      careDetails: careDetails ? JSON.parse(JSON.stringify(careDetails)) : undefined,
      subCategory: {
        connect: { id: productData.subCategoryId }
      },
      images: {
        create: imageUrls.map(url => ({ url })),
      },
    };

    // REVISI: Tambahkan filter validasi untuk harga, sama seperti di metode update.
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

  async update(id: number, updateProductDto: UpdateProductDto, newImageUrls: string[]) {
    const { prices, imagesToDelete, careDetails, ...productData } = updateProductDto;

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id } });
      if (!product) {
        throw new NotFoundException(`Product with ID ${id} not found.`);
      }

      // Gabungkan semua data skalar yang akan diupdate
      const scalarDataToUpdate: Prisma.ProductUpdateInput = {
        ...productData,
        // REVISI: Tangani update careDetails di sini, jangan di-stringify.
        careDetails: careDetails ? JSON.parse(JSON.stringify(careDetails)) : undefined,
      };

      if (Object.keys(scalarDataToUpdate).length > 0) {
        await tx.product.update({
          where: { id },
          data: scalarDataToUpdate,
        });
      }
      
      // Hapus gambar lama
      if (imagesToDelete && imagesToDelete.length > 0) {
        await tx.productImage.deleteMany({
          where: { productId: id, id: { in: imagesToDelete } },
        });
      }

      // Tambah gambar baru
      if (newImageUrls && newImageUrls.length > 0) {
        await tx.productImage.createMany({
          data: newImageUrls.map(url => ({ url, productId: id })),
        });
      }

      // Update harga
      if (prices) { // REVISI: Bisa juga untuk mengosongkan harga dengan array kosong
        await tx.productPrice.deleteMany({ where: { productId: id } });

        if (prices.length > 0) {
            const validPrices = prices.filter(p => p.currencyId != null && p.price != null);
            if(validPrices.length > 0) {
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

      // Kembalikan data produk terbaru
      return tx.product.findUnique({
        where: { id },
        include: this.productInclude,
      });
    });
  }

  async remove(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found.`);
    }
    return this.prisma.product.delete({ where: { id } });
  }
}
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

  async remove(id: number) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found.`);
    }
    return this.prisma.product.delete({ where: { id } });
  }
}
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.product.findMany({
      include: {
        images: true,
        prices: { include: { currency: true } },
        subCategory: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: number) {
    const data = await this.prisma.product.findUnique({
      where: { id },
      include: {
        images: true,
        prices: { include: { currency: true } },
        subCategory: true
      }
    });
    if (!data) throw new NotFoundException('Product not found');
    return data;
  }

  async create(dto: CreateProductDto) {
    return this.prisma.product.create({
      data: {
        ...dto,
        images: dto.images ? { create: dto.images } : undefined,
        prices: { create: dto.prices }
      },
      include: {
        images: true,
        prices: { include: { currency: true } }
      }
    });
  }

  async update(id: number, dto: UpdateProductDto) {
    // Jika ingin replace prices: hapus lalu create lagi
    if (dto.prices) {
      await this.prisma.productPrice.deleteMany({ where: { productId: id } });
    }
    return this.prisma.product.update({
      where: { id },
      data: {
        ...dto,
        images: undefined, // Tidak update images di sini (gunakan endpoint khusus jika perlu)
        prices: dto.prices ? { create: dto.prices } : undefined
      },
      include: {
        images: true,
        prices: { include: { currency: true } }
      }
    });
  }

  async remove(id: number) {
    return this.prisma.product.delete({ where: { id } });
  }
}

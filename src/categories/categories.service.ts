import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import * as fs from 'fs';
import { join } from 'path';
import { Prisma } from '@prisma/client';

@Injectable()
export class CategoriesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.category.findMany({
      orderBy: { id: 'asc' },
      include: {
        subCategories: {
          select: { id: true, name: true, imageUrl: true },
        },
      },
    });
  }

  async findOne(id: number) {
    const data = await this.prisma.category.findUnique({
      where: { id },
      include: {
        subCategories: {
          select: { id: true, name: true, imageUrl: true },
        },
      },
    });
    if (!data) {
      throw new NotFoundException('Category not found');
    }
    return data;
  }

  create(dto: Pick<CreateCategoryDto, 'name'>, imageUrl?: string) {
    return this.prisma.category.create({
      data: {
        name: dto.name as any, // Diterima sebagai object setelah parsing di controller
        imageUrl,
      },
    });
  }

  async update(
    id: number,
    dto: Pick<UpdateCategoryDto, 'name'>,
    newImageUrl?: string,
    deleteImage?: boolean,
  ) {
    const category = await this.findOne(id);
    const oldImageUrl = category.imageUrl;

    const dataToUpdate: any = {};
    if (dto.name) {
        dataToUpdate.name = dto.name;
    }

    if (deleteImage) {
      dataToUpdate.imageUrl = null;
    } else if (newImageUrl) {
      dataToUpdate.imageUrl = newImageUrl;
    }

    if (oldImageUrl && (newImageUrl || deleteImage)) {
      const oldImagePath = join(process.cwd(), oldImageUrl.substring(1));
      if (fs.existsSync(oldImagePath)) {
        try {
          fs.unlinkSync(oldImagePath);
        } catch (err) {
          console.error('Failed to delete old image file:', err);
        }
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async remove(id: number) {
    const category = await this.findOne(id);

    // --- PERUBAHAN UTAMA DIMULAI DI SINI ---
    // Cek apakah ada produk yang terkait dengan sub-kategori di dalam kategori ini
    const relatedProductsCount = await this.prisma.product.count({
      where: {
        subCategory: {
          categoryId: id,
        },
      },
    });

    if (relatedProductsCount > 0) {
      // Jika ada, ambil beberapa nama produk untuk ditampilkan di pesan error
      const relatedProducts = await this.prisma.product.findMany({
        where: { subCategory: { categoryId: id } },
        take: 5, // Ambil maksimal 5 produk untuk contoh
        select: { name: true },
      });
      
      // Ekstrak nama dari format JSON
      const productNames = relatedProducts.map(p => {
          const nameObject = p.name as Prisma.JsonObject;
          return nameObject?.en || nameObject?.id || 'Unnamed Product';
      }).join(', ');

      // Lemparkan error Conflict (409) dengan pesan yang detail
      throw new ConflictException({
        message: `Tidak dapat menghapus kategori karena masih digunakan oleh ${relatedProductsCount} produk.`,
        details: `Contoh produk: ${productNames}. Harap pindahkan atau hapus produk-produk tersebut terlebih dahulu.`
      });
    }
    // --- AKHIR PERUBAHAN ---

    if (category.imageUrl) {
      const imagePath = join(process.cwd(), category.imageUrl.substring(1));
      if (fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
        } catch (err) {
          console.error('Gagal menghapus file gambar saat penghapusan:', err);
        }
      }
    }

    return this.prisma.category.delete({ where: { id } });
  }
}
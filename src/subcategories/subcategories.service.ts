import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';
import * as fs from 'fs';
import { join } from 'path';
import { Prisma } from '@prisma/client';

@Injectable()
export class SubcategoriesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.subCategory.findMany({
      include: {
        category: {
          select: { id: true, name: true, imageUrl: true },
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  async findOne(id: number) {
    const data = await this.prisma.subCategory.findUnique({
      where: { id },
      include: {
        category: {
          select: { id: true, name: true, imageUrl: true },
        },
      },
    });
    if (!data) {
      throw new NotFoundException('SubCategory not found');
    }
    return data;
  }

  create(dto: Pick<CreateSubcategoryDto, 'name' | 'categoryId'>, imageUrl?: string) {
    return this.prisma.subCategory.create({
      data: {
        name: dto.name as any,
        categoryId: dto.categoryId as number,
        imageUrl,
      },
    });
  }

  async update(
    id: number,
    dto: Partial<Pick<UpdateSubcategoryDto, 'name' | 'categoryId'>>,
    newImageUrl?: string,
    deleteImage?: boolean,
  ) {
    const subCategory = await this.findOne(id);
    const oldImageUrl = subCategory.imageUrl;

    const dataToUpdate: any = {};
    if (dto.name) {
      dataToUpdate.name = dto.name;
    }
    if (dto.categoryId !== undefined) {
      dataToUpdate.categoryId = dto.categoryId;
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

    return this.prisma.subCategory.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async remove(id: number) {
    const subCategory = await this.findOne(id);

    // --- PERUBAHAN UTAMA DIMULAI DI SINI ---
    // Cek apakah ada produk yang terkait langsung dengan sub-kategori ini
    const relatedProductsCount = await this.prisma.product.count({
      where: { subCategoryId: id },
    });

    if (relatedProductsCount > 0) {
      // Jika ada, ambil beberapa nama produk untuk ditampilkan di pesan error
      const relatedProducts = await this.prisma.product.findMany({
        where: { subCategoryId: id },
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
        message: `Tidak dapat menghapus sub-kategori karena masih digunakan oleh ${relatedProductsCount} produk.`,
        details: `Contoh produk: ${productNames}. Harap pindahkan atau hapus produk-produk tersebut terlebih dahulu.`
      });
    }
    // --- AKHIR PERUBAHAN ---

    if (subCategory.imageUrl) {
      const imagePath = join(process.cwd(), subCategory.imageUrl.substring(1));
      if (fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
        } catch (err) {
          console.error('Gagal menghapus file gambar saat penghapusan:', err);
        }
      }
    }

    return this.prisma.subCategory.delete({ where: { id } });
  }
}
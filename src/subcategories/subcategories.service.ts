import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';
import * as fs from 'fs';
import { join } from 'path';

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

  create(dto: CreateSubcategoryDto, imageUrl?: string) {
    return this.prisma.subCategory.create({
      data: {
        ...dto,
        imageUrl,
      },
    });
  }

  async update(
    id: number,
    dto: UpdateSubcategoryDto,
    newImageUrl?: string,
    deleteImage?: boolean,
  ) {
    const subCategory = await this.findOne(id);
    const oldImageUrl = subCategory.imageUrl;

    const { name, categoryId } = dto;
    const dataToUpdate: any = { name, categoryId };

    if (deleteImage) {
      dataToUpdate.imageUrl = null;
    } else if (newImageUrl) {
      dataToUpdate.imageUrl = newImageUrl;
    }

    // Hapus file lama dari server jika ada gambar baru atau jika ada permintaan hapus
    if (oldImageUrl && (newImageUrl || deleteImage)) {
      const oldImagePath = join(process.cwd(), oldImageUrl);
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
    // Ambil data sub-kategori terlebih dahulu untuk mendapatkan path gambar
    const subCategory = await this.findOne(id);

    // Hapus file gambar dari server jika ada
    if (subCategory.imageUrl) {
      const imagePath = join(process.cwd(), subCategory.imageUrl);
      if (fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
        } catch (err) {
          console.error('Failed to delete image file during removal:', err);
        }
      }
    }

    // Setelah file dihapus, hapus record dari database
    return this.prisma.subCategory.delete({ where: { id } });
  }
}
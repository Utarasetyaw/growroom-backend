import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import * as fs from 'fs';
import { join } from 'path';

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

  create(dto: CreateCategoryDto, imageUrl?: string) {
    return this.prisma.category.create({
      data: {
        ...dto,
        imageUrl,
      },
    });
  }

  async update(
    id: number,
    dto: UpdateCategoryDto,
    newImageUrl?: string,
    deleteImage?: boolean,
  ) {
    const category = await this.findOne(id);
    const oldImageUrl = category.imageUrl;

    const dataToUpdate: any = { name: dto.name };

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

    return this.prisma.category.update({
      where: { id },
      data: dataToUpdate,
    });
  }

  async remove(id: number) {
    // Ambil data kategori terlebih dahulu untuk mendapatkan path gambar
    const category = await this.findOne(id);

    // Hapus file gambar dari server jika ada
    if (category.imageUrl) {
      const imagePath = join(process.cwd(), category.imageUrl);
      if (fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
        } catch (err) {
          console.error('Failed to delete image file during removal:', err);
        }
      }
    }

    // Setelah file dihapus, hapus record dari database
    return this.prisma.category.delete({ where: { id } });
  }
}
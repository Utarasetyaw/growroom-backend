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
      // Menghapus '/' di awal path sebelum digabungkan
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

    if (category.imageUrl) {
      // Menghapus '/' di awal path sebelum digabungkan
      const imagePath = join(process.cwd(), category.imageUrl.substring(1));
      if (fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
        } catch (err) {
          console.error('Failed to delete image file during removal:', err);
        }
      }
    }

    return this.prisma.category.delete({ where: { id } });
  }
}
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

    if (subCategory.imageUrl) {
      const imagePath = join(process.cwd(), subCategory.imageUrl.substring(1));
      if (fs.existsSync(imagePath)) {
        try {
          fs.unlinkSync(imagePath);
        } catch (err) {
          console.error('Failed to delete image file during removal:', err);
        }
      }
    }

    return this.prisma.subCategory.delete({ where: { id } });
  }
}
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';

@Injectable()
export class SubcategoriesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.subCategory.findMany({
      include: { category: true },
      orderBy: { id: 'asc' }
    });
  }

  async findOne(id: number) {
    const data = await this.prisma.subCategory.findUnique({
      where: { id },
      include: { category: true }
    });
    if (!data) throw new NotFoundException('SubCategory not found');
    return data;
  }

  create(dto: CreateSubcategoryDto) {
    return this.prisma.subCategory.create({ data: dto });
  }

  update(id: number, dto: UpdateSubcategoryDto) {
    return this.prisma.subCategory.update({
      where: { id },
      data: dto,
    });
  }

  remove(id: number) {
    return this.prisma.subCategory.delete({ where: { id } });
  }
}

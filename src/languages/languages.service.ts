import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateLanguageDto } from './dto/update-language.dto';

@Injectable()
export class LanguagesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.language.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: number) {
    const lang = await this.prisma.language.findUnique({ where: { id } });
    if (!lang) throw new NotFoundException('Language not found');
    return lang;
  }

  async update(id: number, dto: UpdateLanguageDto) {
    // Jika ingin set isDefault:true, pastikan language lain isDefault=false
    if (dto.isDefault === true) {
      await this.prisma.language.updateMany({
        data: { isDefault: false },
        where: { NOT: { id } },
      });
    }
    return this.prisma.language.update({ where: { id }, data: dto });
  }

  async findAllActive() {
    return this.prisma.language.findMany({
      where: { isActive: true },
      orderBy: { isDefault: 'desc' }, // Default language akan muncul pertama
    });
  }
}

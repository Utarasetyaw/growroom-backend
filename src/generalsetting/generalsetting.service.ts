// src/generalsetting/generalsetting.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GeneralsettingService {
  constructor(private prisma: PrismaService) {}

  async find() {
    return this.prisma.generalSetting.findUnique({ where: { id: 1 } });
  }

  async update(data: any) {
    return this.prisma.generalSetting.update({
      where: { id: 1 },
      data,
    });
  }
}

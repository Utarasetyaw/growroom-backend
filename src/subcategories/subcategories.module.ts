import { Module } from '@nestjs/common';
import { SubcategoriesService } from './subcategories.service';
import { SubcategoriesController } from './subcategories.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [SubcategoriesController],
  providers: [SubcategoriesService, PrismaService],
  exports: [SubcategoriesService],
})
export class SubcategoriesModule {}

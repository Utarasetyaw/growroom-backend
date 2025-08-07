// File: src/cart/cart.module.ts
import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { PrismaService } from '../prisma/prisma.service';

@Module({
  controllers: [CartController],
  providers: [CartService, PrismaService],
  exports: [CartService], // <-- PASTIKAN BARIS INI ADA
})
export class CartModule {}
// src/pdf/pdf.module.ts

import { Module } from '@nestjs/common';
import { PdfService } from './pdf.service';
import { PrismaModule } from '../prisma/prisma.module'; // <-- 1. IMPORT PrismaModule

@Module({
  imports: [PrismaModule], // <-- 2. TAMBAHKAN PrismaModule di sini
  providers: [PdfService],
  exports: [PdfService],
})
export class PdfModule {}
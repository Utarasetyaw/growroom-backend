import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdatePaymentmethodDto } from './dto/update-paymentmethod.dto';

@Injectable()
export class PaymentmethodService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.paymentMethod.findMany({ orderBy: { id: 'asc' } });
  }

  async update(id: number, data: UpdatePaymentmethodDto) {
    const payment = await this.prisma.paymentMethod.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Payment Method not found');

    return this.prisma.paymentMethod.update({
      where: { id },
      data,
    });
  }
}

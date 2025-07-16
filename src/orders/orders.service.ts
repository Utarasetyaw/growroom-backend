import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  // User create order
  async create(userId: number, dto: CreateOrderDto) {
    // subtotal & total validasi disini jika perlu
    // OrderItems input: [{productId, qty, price}]
    const { orderItems, ...orderData } = dto;
    const created = await this.prisma.order.create({
      data: {
        ...orderData,
        userId,
        orderItems: {
          create: orderItems.map(item => ({
            productId: item.productId,
            qty: item.qty,
            price: item.price,
            subtotal: item.price * item.qty,
          })),
        },
      },
      include: { orderItems: true }
    });
    return created;
  }

  // User: lihat order sendiri, Owner/Admin: semua order
  async findAll(role: string, userId?: number) {
    const where = role === 'USER' ? { userId } : {};
    return this.prisma.order.findMany({
      where,
      include: { orderItems: { include: { product: true } }, user: true },
      orderBy: { createdAt: 'desc' }
    });
  }

  async findOne(id: number, role: string, userId?: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { orderItems: { include: { product: true } }, user: true }
    });
    if (!order) throw new NotFoundException('Order not found');
    if (role === 'USER' && order.userId !== userId)
      throw new ForbiddenException('Akses ditolak');
    return order;
  }

  // Owner/Admin update status (paymentStatus/orderStatus)
  async updateStatus(id: number, dto: UpdateOrderDto, role: string, user: any) {
    if (role !== 'OWNER' && !(role === 'ADMIN' && user.permissions?.includes('finance'))) {
      throw new ForbiddenException('Only owner/admin-finance can update status');
    }
    return this.prisma.order.update({ where: { id }, data: dto });
  }
}

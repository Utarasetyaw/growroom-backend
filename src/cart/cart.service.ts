import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  private readonly cartInclude = {
    items: {
      orderBy: { id: 'asc' as const },
      include: {
        product: {
          include: {
            images: { take: 1, select: { url: true } }, // Ambil 1 gambar
            prices: { take: 1, select: { price: true } }, // Ambil 1 harga
          },
        },
      },
    },
  } as const;

  async getCart(userId: number) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: this.cartInclude,
    });

    if (!cart) {
      // Jika user belum punya cart, buatkan yang baru
      return this.prisma.cart.create({
        data: { userId },
        include: this.cartInclude,
      });
    }
    return cart;
  }

  async addItem(userId: number, dto: AddToCartDto) {
    const { productId, quantity } = dto;
    const cart = await this.getCart(userId);

    const existingItem = await this.prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });

    if (existingItem) {
      // Jika item sudah ada, update kuantitasnya
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
      });
    } else {
      // Jika item baru, tambahkan ke cart
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, productId, quantity },
      });
    }
    return this.getCart(userId);
  }

  async updateItemQuantity(userId: number, itemId: number, quantity: number) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cart: { userId } },
    });
    if (!item) throw new NotFoundException('Item not found in your cart.');

    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }

  async removeItem(userId: number, itemId: number) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cart: { userId } },
    });
    if (!item) throw new NotFoundException('Item not found in your cart.');

    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return { message: 'Item removed successfully' };
  }

  async clearCart(userId: number) {
    const cart = await this.getCart(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return { message: 'Cart cleared successfully' };
  }
}
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { DiscountType } from '@prisma/client';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  private readonly cartInclude = {
    items: {
      orderBy: { id: 'asc' as const },
      include: {
        product: {
          include: {
            images: { take: 1, select: { url: true } },
            prices: {
              include: {
                currency: true,
              },
            },
            discounts: {
              where: {
                type: DiscountType.SALE,
                isActive: true,
                startDate: { lte: new Date() },
                endDate: { gte: new Date() },
              },
              orderBy: {
                createdAt: 'desc' as const,
              },
            },
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
      return this.prisma.cart.create({
        data: { userId },
        include: this.cartInclude,
      });
    }
    return cart;
  }

  async addItem(userId: number, dto: AddToCartDto) {
    const { productId, quantity } = dto;

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found or is inactive.');
    }
    
    const cart = await this.getCart(userId);
    const existingItem = await this.prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });

    const newQuantity = (existingItem?.quantity || 0) + quantity;

    if (product.stock < newQuantity) {
      throw new BadRequestException(`Insufficient stock. Only ${product.stock} items available.`);
    }

    if (existingItem) {
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, productId, quantity },
      });
    }

    return this.getCart(userId);
  }

  async updateItemQuantity(userId: number, itemId: number, quantity: number) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cart: { userId } },
      include: { product: true },
    });
    if (!item) {
      throw new NotFoundException('Item not found in your cart.');
    }

    if (item.product.stock < quantity) {
        throw new BadRequestException(`Insufficient stock. Only ${item.product.stock} items available.`);
    }

    if (quantity <= 0) {
      await this.prisma.cartItem.delete({ where: { id: itemId } });
    } else {
      await this.prisma.cartItem.update({
        where: { id: itemId },
        data: { quantity },
      });
    }

    return this.getCart(userId);
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
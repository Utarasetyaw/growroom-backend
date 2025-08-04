import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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
            images: { take: 1, select: { url: true } },
            prices: {
              take: 1,
              select: { price: true },
              // Anda bisa menambahkan 'where' di sini jika ingin harga mata uang tertentu
            },
          },
        },
      },
    },
  } as const;

  /**
   * Mengambil atau membuat keranjang belanja untuk pengguna.
   */
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

  /**
   * Menambahkan item ke keranjang dengan validasi stok.
   */
  async addItem(userId: number, dto: AddToCartDto) {
    const { productId, quantity } = dto;

    // 1. Validasi produk dan stok
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product || !product.isActive) {
      throw new NotFoundException('Product not found or is inactive.');
    }
    
    // 2. Dapatkan keranjang pengguna
    const cart = await this.getCart(userId);
    const existingItem = await this.prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });

    const newQuantity = (existingItem?.quantity || 0) + quantity;

    // 3. Cek apakah kuantitas yang diminta melebihi stok
    if (product.stock < newQuantity) {
      throw new BadRequestException(`Insufficient stock. Only ${product.stock} items available.`);
    }

    // 4. Tambah atau update item
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

  /**
   * Mengupdate kuantitas item dan mengembalikan isi keranjang terbaru.
   */
  async updateItemQuantity(userId: number, itemId: number, quantity: number) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cart: { userId } },
      include: { product: true }, // Sertakan produk untuk cek stok
    });
    if (!item) {
      throw new NotFoundException('Item not found in your cart.');
    }

    // Validasi stok saat update
    if (item.product.stock < quantity) {
        throw new BadRequestException(`Insufficient stock. Only ${item.product.stock} items available.`);
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });

    // Kembalikan seluruh isi cart yang sudah diupdate agar konsisten
    return this.getCart(userId);
  }

  /**
   * Menghapus satu item dari keranjang.
   */
  async removeItem(userId: number, itemId: number) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cart: { userId } },
    });
    if (!item) throw new NotFoundException('Item not found in your cart.');

    await this.prisma.cartItem.delete({ where: { id: itemId } });
    return { message: 'Item removed successfully' };
  }

  /**
   * Mengosongkan semua isi keranjang.
   */
  async clearCart(userId: number) {
    const cart = await this.getCart(userId);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return { message: 'Cart cleared successfully' };
  }
}
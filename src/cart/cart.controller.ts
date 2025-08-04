import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody, ApiNotFoundResponse, ApiBadRequestResponse } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto } from './dto/add-to-cart.dto';
import { UpdateCartItemDto } from './dto/update-cart.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import { CartResponseDto, MessageResponseDto } from './dto/cart-response.dto';

@ApiTags('Cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Melihat isi keranjang belanja' })
  @ApiResponse({ status: 200, description: 'Keranjang belanja pengguna.', type: CartResponseDto })
  getMyCart(@Req() req: RequestWithUser) {
    return this.cartService.getCart(req.user.userId);
  }

  @Post('items')
  @ApiOperation({ summary: 'Menambahkan item ke keranjang' })
  @ApiBody({ type: AddToCartDto })
  @ApiResponse({ status: 201, description: 'Item berhasil ditambahkan, mengembalikan isi keranjang terbaru.', type: CartResponseDto })
  @ApiNotFoundResponse({ description: 'Produk tidak ditemukan atau tidak aktif.' })
  @ApiBadRequestResponse({ description: 'Stok produk tidak mencukupi.' })
  addItem(@Req() req: RequestWithUser, @Body() dto: AddToCartDto) {
    return this.cartService.addItem(req.user.userId, dto);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Mengupdate kuantitas item di keranjang' })
  @ApiBody({ type: UpdateCartItemDto })
  @ApiResponse({ status: 200, description: 'Kuantitas item berhasil diupdate, mengembalikan isi keranjang terbaru.', type: CartResponseDto })
  @ApiNotFoundResponse({ description: 'Item tidak ditemukan di keranjang.' })
  @ApiBadRequestResponse({ description: 'Stok produk tidak mencukupi.' })
  updateItem(
    @Req() req: RequestWithUser,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItemQuantity(req.user.userId, itemId, dto.quantity);
  }

  @Delete('items/:itemId')
  @ApiOperation({ summary: 'Menghapus satu item dari keranjang' })
  @ApiResponse({ status: 200, description: 'Item berhasil dihapus.', type: MessageResponseDto })
  @ApiNotFoundResponse({ description: 'Item tidak ditemukan di keranjang.' })
  removeItem(
    @Req() req: RequestWithUser,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.cartService.removeItem(req.user.userId, itemId);
  }

  @Delete()
  @ApiOperation({ summary: 'Mengosongkan semua isi keranjang' })
  @ApiResponse({ status: 200, description: 'Keranjang berhasil dikosongkan.', type: MessageResponseDto })
  clearCart(@Req() req: RequestWithUser) {
    return this.cartService.clearCart(req.user.userId);
  }
}
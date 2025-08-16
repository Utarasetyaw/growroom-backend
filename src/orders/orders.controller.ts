import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  Req,
  Res,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiForbiddenResponse,
  ApiQuery,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import { Response } from 'express';
import { OrderResponseDto } from './dto/order-response.dto';
// Ganti nama alias agar lebih jelas
import { CreateOrderResponse } from './dto/create-order-response.dto';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @HttpCode(HttpStatus.CREATED) // Menegaskan status code 201
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Membuat order baru (User Only)' })
  @ApiResponse({
    status: 201,
    description: 'Order berhasil dibuat dan mengembalikan detail pembayaran.',
    type: CreateOrderResponse, // Menggunakan DTO yang lebih spesifik
  })
  @ApiBadRequestResponse({ description: 'Data yang dikirim tidak valid (misal: stok kurang, item kosong).' })
  create(@Req() req: RequestWithUser, @Body() dto: CreateOrderDto) {
    return this.service.create(req.user.userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mendapatkan semua order (Admin/Owner Only)' })
  @ApiResponse({ status: 200, description: 'Daftar semua order berhasil diambil.' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  findAll(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10',
  ) {
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    return this.service.findAll({ page: pageNumber, limit: limitNumber });
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mendapatkan semua order milik user yang login' })
  @ApiResponse({ status: 200, description: 'Daftar order milik user berhasil diambil.', type: [OrderResponseDto] })
  getMyOrders(@Req() req: RequestWithUser) {
    return this.service.findUserOrders(req.user.userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN, Role.USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mendapatkan detail order berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Detail order berhasil diambil.', type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Order dengan ID yang diberikan tidak ditemukan.' })
  @ApiForbiddenResponse({ description: 'Anda tidak memiliki hak akses untuk melihat order ini.' })
  findOne(@Req() req: RequestWithUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(
      id,
      req.user.role === Role.USER ? req.user.userId : undefined,
    );
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update status order (Admin/Owner Only)' })
  @ApiResponse({ status: 200, description: 'Status order berhasil diperbarui.', type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Order dengan ID yang diberikan tidak ditemukan.' })
  @ApiBadRequestResponse({ description: 'Data status yang dikirim tidak valid.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderDto) {
    return this.service.update(id, dto);
  }

  @Get(':id/invoice/pdf')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN, Role.USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download invoice dalam format PDF' })
  @ApiResponse({ status: 200, description: 'File PDF invoice berhasil dibuat.' })
  @ApiNotFoundResponse({ description: 'Order dengan ID yang diberikan tidak ditemukan.' })
  @ApiForbiddenResponse({ description: 'Anda tidak memiliki hak akses untuk mengunduh invoice ini.' })
  async downloadInvoicePdf(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    try {
      const buffer = await this.service.generateInvoicePdf(
        id,
        req.user.role === Role.USER ? req.user.userId : undefined,
      );
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=invoice-order-${id}.pdf`,
      );
      // Menggunakan res.send() lebih umum di Express untuk mengirim buffer
      res.send(buffer);
    } catch (error) {
        // Menangani error dari service layer (misal: NotFoundException)
        // dan mengirim respons yang sesuai.
        res.status(error.status || 500).json({
            statusCode: error.status || 500,
            message: error.message || 'Gagal membuat file PDF.',
        });
    }
  }

  @Post(':id/retry-payment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mencoba kembali pembayaran untuk order yang PENDING' })
  @ApiResponse({
    status: 200,
    description: 'Proses pembayaran berhasil diinisiasi ulang.',
  })
  @ApiNotFoundResponse({ description: 'Order tidak ditemukan.' })
  @ApiForbiddenResponse({ description: 'Akses ditolak atau order tidak dalam status yang valid untuk dicoba ulang.' })
  retryPayment(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.retryPayment(id, req.user.userId);
  }
}
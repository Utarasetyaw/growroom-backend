// File: src/orders/orders.controller.ts

import { Controller, Get, Post, Patch, Param, Body, ParseIntPipe, UseGuards, Req, Res, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiNotFoundResponse, ApiForbiddenResponse, ApiQuery } from '@nestjs/swagger';
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
import { CreateOrderResponseDto } from './dto/create-order-response.dto';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Public()
  @Post('webhook/payment')
  @ApiOperation({ summary: 'Endpoint untuk menerima notifikasi pembayaran (Webhook)' })
  @ApiResponse({ status: 200, description: 'Notifikasi berhasil diproses.' })
  handlePaymentNotification(@Body() notificationPayload: any) {
    return this.service.handlePaymentNotification(notificationPayload);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Membuat order baru (User Only)' })
  @ApiResponse({ status: 201, description: 'Order berhasil dibuat.', type: CreateOrderResponseDto })
  create(@Req() req: RequestWithUser, @Body() dto: CreateOrderDto) {
    return this.service.create(req.user.userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mendapatkan semua order (Admin/Owner Only)' })
  @ApiResponse({ status: 200, type: [OrderResponseDto] })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  findAll(@Query('page') page: number = 1, @Query('limit') limit: number = 10) {
    return this.service.findAll({ page, limit });
  }

  @Get('my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mendapatkan semua order milik user yang login' })
  @ApiResponse({ status: 200, type: [OrderResponseDto] })
  getMyOrders(@Req() req: RequestWithUser) {
    return this.service.findUserOrders(req.user.userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN, Role.USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mendapatkan detail order berdasarkan ID' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  findOne(@Req() req: RequestWithUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id, req.user.role === Role.USER ? req.user.userId : undefined);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update status order (Admin/Owner Only)' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderDto) {
    return this.service.update(id, dto);
  }

  @Get(':id/invoice/pdf')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.OWNER, Role.ADMIN, Role.USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Download invoice dalam format PDF' })
  async downloadInvoicePdf(@Req() req: RequestWithUser, @Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const buffer = await this.service.generateInvoicePdf(id, req.user.role === Role.USER ? req.user.userId : undefined);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-order-${id}.pdf`);
    res.end(buffer);
  }

  // --- TAMBAHAN: Endpoint baru untuk mencoba kembali pembayaran ---
  @Post(':id/retry-payment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.USER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mencoba kembali pembayaran untuk order yang berstatus PENDING' })
  @ApiResponse({ status: 200, description: 'Proses pembayaran berhasil diinisiasi ulang.' })
  @ApiNotFoundResponse({ description: 'Order tidak ditemukan.' })
  @ApiForbiddenResponse({ description: 'Akses ditolak atau order tidak dalam status PENDING.' })
  retryPayment(@Req() req: RequestWithUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.retryPayment(id, req.user.userId);
  }
}
import { Controller, Get, Post, Patch, Param, Body, ParseIntPipe, UseGuards, Req, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiNotFoundResponse, ApiForbiddenResponse } from '@nestjs/swagger';
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

@ApiTags('Orders')
@ApiBearerAuth()
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post()
  @Roles(Role.USER)
  @ApiOperation({ summary: 'Membuat order baru (User Only)' })
  @ApiResponse({ status: 201, description: 'Order berhasil dibuat, mengembalikan detail order dan info pembayaran.', type: CreateOrderResponseDto })
  create(@Req() req: RequestWithUser, @Body() dto: CreateOrderDto) {
    return this.service.create(req.user.userId, dto);
  }

  @Get()
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Mendapatkan semua order (Admin/Owner Only)' })
  @ApiResponse({ status: 200, type: [OrderResponseDto] })
  findAll() {
    return this.service.findAll();
  }

  @Get('my')
  @Roles(Role.USER)
  @ApiOperation({ summary: 'Mendapatkan semua order milik user yang login' })
  @ApiResponse({ status: 200, type: [OrderResponseDto] })
  getMyOrders(@Req() req: RequestWithUser) {
    return this.service.findUserOrders(req.user.userId);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.USER)
  @ApiOperation({ summary: 'Mendapatkan detail order berdasarkan ID' })
  @ApiParam({ name: 'id', description: 'ID dari order' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Order tidak ditemukan.' })
  @ApiForbiddenResponse({ description: 'Akses ditolak.' })
  findOne(@Req() req: RequestWithUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id, req.user.role === Role.USER ? req.user.userId : undefined);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Update status order (Admin/Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID dari order' })
  @ApiResponse({ status: 200, type: OrderResponseDto })
  @ApiNotFoundResponse({ description: 'Order tidak ditemukan.' })
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderDto) {
    return this.service.update(id, dto);
  }

  @Get(':id/invoice/pdf')
  @Roles(Role.OWNER, Role.ADMIN, Role.USER)
  @ApiOperation({ summary: 'Download invoice dalam format PDF' })
  @ApiParam({ name: 'id', description: 'ID dari order' })
  @ApiResponse({ status: 200, description: 'Mengembalikan file PDF invoice.', content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } } })
  @ApiNotFoundResponse({ description: 'Order tidak ditemukan.' })
  @ApiForbiddenResponse({ description: 'Akses ditolak.' })
  async downloadInvoicePdf(
    @Req() req: RequestWithUser, @Param('id', ParseIntPipe) id: number, @Res() res: Response
  ) {
    const buffer = await this.service.generateInvoicePdf(id, req.user.role === Role.USER ? req.user.userId : undefined);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-order-${id}.pdf`);
    res.end(buffer);
  }
}
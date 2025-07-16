import {
  Controller, Get, Post, Body, Param, Patch, UseGuards, ParseIntPipe, Req
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // User buat order
  @Post()
  @Roles(Role.USER)
  async create(@Req() req: RequestWithUser, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(req.user.userId, dto);
  }

  // List order: user (punya sendiri), admin/owner (semua)
  @Get()
  @Roles(Role.OWNER, Role.ADMIN, Role.USER)
  async findAll(@Req() req: RequestWithUser) {
    return this.ordersService.findAll(req.user.role, req.user.userId);
  }

  // Detail order
  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.USER)
  async findOne(@Req() req: RequestWithUser, @Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOne(id, req.user.role, req.user.userId);
  }

  // Owner/admin-finance update status
  @Patch(':id/status')
  @Roles(Role.OWNER, Role.ADMIN)
  async updateStatus(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderDto
  ) {
    return this.ordersService.updateStatus(id, dto, req.user.role, req.user);
  }
}

import {
  Controller, Get, Post, Patch, Param, Body, ParseIntPipe, UseGuards, Req
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
  constructor(private readonly service: OrdersService) {}

  // User: create order
  @Post()
  @Roles(Role.USER)
  create(@Req() req: RequestWithUser, @Body() dto: CreateOrderDto) {
    return this.service.create(req.user.userId, dto);
  }

  // Owner/admin: list all orders
  @Get()
  @Roles(Role.OWNER, Role.ADMIN)
  findAll() {
    return this.service.findAll();
  }

  // User: get own orders
  @Get('my')
  @Roles(Role.USER)
  getMyOrders(@Req() req: RequestWithUser) {
    return this.service.findUserOrders(req.user.userId);
  }

  // Owner/admin: detail order, user: get own order
  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.USER)
  findOne(@Req() req: RequestWithUser, @Param('id', ParseIntPipe) id: number) {
    if (req.user.role === Role.USER) {
      return this.service.findOne(id, req.user.userId);
    }
    return this.service.findOne(id);
  }

  // Owner/admin: update status
  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderDto) {
    return this.service.update(id, dto);
  }
}

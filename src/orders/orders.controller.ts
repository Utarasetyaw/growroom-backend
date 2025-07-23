import {
  Controller, Get, Post, Patch, Param, Body, ParseIntPipe, UseGuards, Req, Res
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import { Response } from 'express';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrdersController {
  constructor(private readonly service: OrdersService) {}

  @Post()
  @Roles(Role.USER)
  create(@Req() req: RequestWithUser, @Body() dto: CreateOrderDto) {
    return this.service.create(req.user.userId, dto);
  }

  @Get()
  @Roles(Role.OWNER, Role.ADMIN)
  findAll() {
    return this.service.findAll();
  }

  @Get('my')
  @Roles(Role.USER)
  getMyOrders(@Req() req: RequestWithUser) {
    return this.service.findUserOrders(req.user.userId);
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN, Role.USER)
  findOne(@Req() req: RequestWithUser, @Param('id', ParseIntPipe) id: number) {
    if (req.user.role === Role.USER) {
      return this.service.findOne(id, req.user.userId);
    }
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOrderDto) {
    return this.service.update(id, dto);
  }

  // === DOWNLOAD PDF INVOICE ===
  @Get(':id/invoice/pdf')
  @Roles(Role.OWNER, Role.ADMIN, Role.USER)
  async downloadInvoicePdf(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response
  ) {
    const buffer = await this.service.generateInvoicePdf(id, req.user.role === Role.USER ? req.user.userId : undefined);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=invoice-order-${id}.pdf`);
    res.end(buffer);
  }
}

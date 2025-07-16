// src/shipping-provider/shipping-provider.controller.ts
import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, ParseIntPipe
} from '@nestjs/common';
import { ShippingProviderService } from './shipping-provider.service';
import { CreateShippingProviderDto } from './dto/create-shipping-provider.dto';
import { UpdateShippingProviderDto } from './dto/update-shipping-provider.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('shipping-providers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShippingProviderController {
  constructor(private readonly service: ShippingProviderService) {}

  @Get()
  @Roles(Role.OWNER)
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Roles(Role.OWNER)
  create(@Body() dto: CreateShippingProviderDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Role.OWNER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateShippingProviderDto
  ) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}

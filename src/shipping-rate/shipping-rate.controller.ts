import { Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe, UseGuards } from '@nestjs/common';
import { ShippingRateService } from './shipping-rate.service';
import { CreateShippingRateDto } from './dto/create-shipping-rate.dto';
import { UpdateShippingRateDto } from './dto/update-shipping-rate.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('shipping-rates')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShippingRateController {
  constructor(private readonly service: ShippingRateService) {}

  @Get()
  @Roles(Role.OWNER)
  async findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles(Role.OWNER)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.OWNER)
  async create(@Body() dto: CreateShippingRateDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Role.OWNER)
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateShippingRateDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}

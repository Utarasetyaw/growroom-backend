// src/shipping-zone/shipping-zone.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  ParseIntPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ShippingZoneService } from './shipping-zone.service';
import { CreateShippingZoneDto } from './dto/create-shipping-zone.dto';
import { UpdateShippingZoneDto } from './dto/update-shipping-zone.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('shipping-zones')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShippingZoneController {
  constructor(private readonly service: ShippingZoneService) {}

  @Get()
  @Roles(Role.OWNER)
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles(Role.OWNER)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.OWNER)
  create(@Body() dto: CreateShippingZoneDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Role.OWNER)
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateShippingZoneDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.OWNER)
  remove(@Param('id', ParseIntPipe) id: n

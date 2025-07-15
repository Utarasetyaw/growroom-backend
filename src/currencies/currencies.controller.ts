// src/currencies/currencies.controller.ts
import {
  Controller, Get, Patch, Param, Body, UseGuards, ParseIntPipe
} from '@nestjs/common';
import { CurrenciesService } from './currencies.service';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@Controller('currencies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Get()
  @Roles(Role.OWNER)
  findAll() {
    return this.currenciesService.findAll();
  }

  @Patch(':id')
  @Roles(Role.OWNER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCurrencyDto,
  ) {
    return this.currenciesService.update(id, dto);
  }
}

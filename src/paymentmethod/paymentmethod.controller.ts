import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { PaymentmethodService } from './paymentmethod.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UpdatePaymentmethodDto } from './dto/update-paymentmethod.dto';

@Controller('payment-methods')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentmethodController {
  constructor(private readonly service: PaymentmethodService) {}

  @Get()
  @Roles(Role.OWNER)
  async findAll() {
    return this.service.findAll();
  }

  @Patch(':id')
  @Roles(Role.OWNER)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdatePaymentmethodDto
  ) {
    return this.service.update(id, body);
  }
}

import { Controller, Get, Patch, Param, Body, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBearerAuth, ApiNotFoundResponse, ApiBody } from '@nestjs/swagger';
import { CurrenciesService } from './currencies.service';
import { UpdateCurrencyDto } from './dto/update-currency.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { CurrencyResponseDto } from './dto/currency-response.dto';

@ApiTags('currencies')
@ApiBearerAuth()
@Controller('currencies')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CurrenciesController {
  constructor(private readonly currenciesService: CurrenciesService) {}

  @Get()
  // PERBAIKAN: Menambahkan Role.ADMIN untuk memberikan izin baca
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Mendapatkan semua mata uang (Owner & Admin)' })
  @ApiResponse({ status: 200, description: 'List semua mata uang.', type: [CurrencyResponseDto] })
  findAll() {
    return this.currenciesService.findAll();
  }

  @Patch(':id')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Update status mata uang (Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID dari mata uang' })
  @ApiBody({ type: UpdateCurrencyDto })
  @ApiResponse({ status: 200, description: 'Mata uang berhasil di-update.', type: CurrencyResponseDto })
  @ApiNotFoundResponse({ description: 'Mata uang tidak ditemukan.' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCurrencyDto,
  ) {
    return this.currenciesService.update(id, dto);
  }
}

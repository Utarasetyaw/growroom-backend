import {
  Controller,
  Get,
  Query,
  UseGuards,
  Post,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  Logger, // <-- 1. Import Logger
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBearerAuth,
  ApiBody,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Response } from 'express';
import { SummaryResponseDto } from './dto/summary-response.dto';
import { ChartResponseDto } from './dto/chart-response.dto';
import { ExportEmailDto } from './dto/export-email.dto';

@ApiTags('Finance & Reports')
@ApiBearerAuth()
@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER, Role.ADMIN)
export class FinanceController {
  // --- 2. Inisialisasi Logger ---
  private readonly logger = new Logger(FinanceController.name);

  constructor(private readonly service: FinanceService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Ringkasan keuangan untuk rentang waktu custom' })
  @ApiQuery({ name: 'start', description: 'Tanggal mulai (YYYY-MM-DD)', type: String })
  @ApiQuery({ name: 'end', description: 'Tanggal akhir (YYYY-MM-DD)', type: String })
  @ApiResponse({ status: 200, type: SummaryResponseDto })
  @ApiBadRequestResponse({ description: 'Format tanggal tidak valid.' })
  summaryRange(@Query('start') start: string, @Query('end') end: string) {
    this.logger.log(`Endpoint GET /finance/summary dipanggil dengan rentang: ${start} - ${end}`);
    return this.service.summaryRange(start, end);
  }

  @Get('chart')
  @ApiOperation({ summary: 'Data omset untuk grafik' })
  @ApiQuery({ name: 'mode', enum: ['day', 'week', 'month'], description: 'Kelompokkan data per hari/minggu/bulan' })
  @ApiQuery({ name: 'start', description: 'Tanggal mulai (YYYY-MM-DD)', type: String })
  @ApiQuery({ name: 'end', description: 'Tanggal akhir (YYYY-MM-DD)', type: String })
  @ApiResponse({ status: 200, type: [ChartResponseDto] })
  @ApiBadRequestResponse({ description: 'Format tanggal tidak valid.' })
  chart(
    @Query('mode') mode: 'day' | 'week' | 'month' = 'day',
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    this.logger.log(`Endpoint GET /finance/chart dipanggil dengan mode: ${mode}, rentang: ${start} - ${end}`);
    return this.service.chart(mode, start, end);
  }

  @Get('export/pdf')
  @ApiOperation({ summary: 'Download laporan keuangan dalam format PDF' })
  @ApiQuery({ name: 'start', description: 'Tanggal mulai (YYYY-MM-DD)', type: String })
  @ApiQuery({ name: 'end', description: 'Tanggal akhir (YYYY-MM-DD)', type: String })
  @ApiResponse({ status: 200, description: 'Mengembalikan file PDF untuk diunduh.' })
  @ApiBadRequestResponse({ description: 'Format tanggal tidak valid.' })
  async exportPdf(
    @Query('start') start: string,
    @Query('end') end: string,
    @Res() res: Response,
  ) {
    this.logger.log(`Endpoint GET /finance/export/pdf dipanggil dengan rentang: ${start} - ${end}`);
    try {
      const pdfBuffer = await this.service.generatePdfReport(start, end);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=laporan-keuangan-${start}-sd-${end}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      // --- 3. Tambahkan Log Error ---
      this.logger.error(`Gagal membuat PDF untuk rentang: ${start} - ${end}`, error.stack);
      res.status(error.status || 500).json({
        statusCode: error.status || 500,
        message: error.message || 'Gagal membuat file PDF laporan.',
      });
    }
  }

  @Post('export/email')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Generate laporan PDF dan kirim ke email' })
  @ApiBody({ type: ExportEmailDto })
  @ApiResponse({ status: 201, description: 'Laporan berhasil dikirim ke email.' })
  @ApiBadRequestResponse({ description: 'Format tanggal atau email tidak valid.' })
  async exportPdfEmail(@Body() body: ExportEmailDto) {
    this.logger.log(`Endpoint POST /finance/export/email dipanggil untuk email: ${body.email}`);
    return this.service.exportPdfReportAndSendEmail(body.start, body.end, body.email);
  }
}
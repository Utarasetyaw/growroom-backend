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
// REVISI: ExportPdfDto tidak diperlukan lagi karena kita akan menggunakan Query Params

@ApiTags('Finance & Reports')
@ApiBearerAuth()
@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER, Role.ADMIN)
export class FinanceController {
  constructor(private readonly service: FinanceService) {}

  // ... (endpoint summary/today, summary/week, summary/month tetap sama) ...

  @Get('summary')
  @ApiOperation({ summary: 'Ringkasan keuangan untuk rentang waktu custom' })
  @ApiQuery({ name: 'start', description: 'Tanggal mulai (YYYY-MM-DD)', type: String })
  @ApiQuery({ name: 'end', description: 'Tanggal akhir (YYYY-MM-DD)', type: String })
  @ApiResponse({ status: 200, type: SummaryResponseDto })
  @ApiBadRequestResponse({ description: 'Format tanggal tidak valid.' })
  summaryRange(@Query('start') start: string, @Query('end') end: string) {
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
    return this.service.chart(mode, start, end);
  }

  /**
   * REVISI: Mengubah endpoint dari POST menjadi GET untuk mengikuti konvensi REST.
   * Data 'start' dan 'end' sekarang diambil dari query parameter.
   */
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
    try {
      const pdfBuffer = await this.service.generatePdfReport(start, end);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=laporan-keuangan-${start}-sd-${end}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      res.status(error.status || 500).json({
        statusCode: error.status || 500,
        message: error.message || 'Gagal membuat file PDF laporan.',
      });
    }
  }

  @Post('export/email')
  @HttpCode(HttpStatus.CREATED) // REVISI: Menggunakan status 201 untuk aksi "kirim"
  @ApiOperation({ summary: 'Generate laporan PDF dan kirim ke email' })
  @ApiBody({ type: ExportEmailDto })
  @ApiResponse({ status: 201, description: 'Laporan berhasil dikirim ke email.' })
  @ApiBadRequestResponse({ description: 'Format tanggal atau email tidak valid.' })
  async exportPdfEmail(@Body() body: ExportEmailDto) {
    return this.service.exportPdfReportAndSendEmail(body.start, body.end, body.email);
  }
}
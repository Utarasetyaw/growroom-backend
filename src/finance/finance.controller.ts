import { Controller, Get, Query, UseGuards, Post, Body, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Response } from 'express';
import { SummaryResponseDto } from './dto/summary-response.dto';
import { ChartResponseDto } from './dto/chart-response.dto';
import { ExportPdfDto } from './dto/export-pdf.dto';
import { ExportEmailDto } from './dto/export-email.dto';

@ApiTags('Finance & Reports')
@ApiBearerAuth()
@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER, Role.ADMIN)
export class FinanceController {
  constructor(private readonly service: FinanceService) {}

  @Get('summary/today')
  @ApiOperation({ summary: 'Ringkasan keuangan untuk hari ini' })
  @ApiResponse({ status: 200, type: SummaryResponseDto })
  summaryToday() {
    return this.service.summaryToday();
  }

  @Get('summary/week')
  @ApiOperation({ summary: 'Ringkasan keuangan untuk minggu ini' })
  @ApiResponse({ status: 200, type: SummaryResponseDto })
  summaryWeek() {
    return this.service.summaryWeek();
  }

  @Get('summary/month')
  @ApiOperation({ summary: 'Ringkasan keuangan untuk bulan ini' })
  @ApiResponse({ status: 200, type: SummaryResponseDto })
  summaryMonth() {
    return this.service.summaryMonth();
  }

  @Get('summary')
  @ApiOperation({ summary: 'Ringkasan keuangan untuk rentang waktu custom' })
  @ApiQuery({ name: 'start', description: 'Tanggal mulai (YYYY-MM-DD)', type: String })
  @ApiQuery({ name: 'end', description: 'Tanggal akhir (YYYY-MM-DD)', type: String })
  @ApiResponse({ status: 200, type: SummaryResponseDto })
  summaryRange(@Query('start') start: string, @Query('end') end: string) {
    return this.service.summaryRange(start, end);
  }

  @Get('chart')
  @ApiOperation({ summary: 'Data omset untuk grafik' })
  @ApiQuery({ name: 'mode', enum: ['day', 'week', 'month'], description: 'Kelompokkan data per hari/minggu/bulan' })
  @ApiQuery({ name: 'start', description: 'Tanggal mulai (YYYY-MM-DD)', type: String })
  @ApiQuery({ name: 'end', description: 'Tanggal akhir (YYYY-MM-DD)', type: String })
  @ApiResponse({ status: 200, type: [ChartResponseDto] })
  chart(
    @Query('mode') mode: 'day' | 'week' | 'month' = 'day',
    @Query('start') start: string,
    @Query('end') end: string,
  ) {
    return this.service.chart(mode, start, end);
  }

  @Post('export/pdf')
  @ApiOperation({ summary: 'Download laporan keuangan dalam format PDF' })
  @ApiBody({ type: ExportPdfDto })
  @ApiResponse({ status: 200, description: 'Mengembalikan file PDF untuk diunduh.', content: { 'application/pdf': { schema: { type: 'string', format: 'binary' } } } })
  async exportPdf(@Body() body: ExportPdfDto, @Res() res: Response) {
    const pdfBuffer = await this.service.generatePdfReport(body.start, body.end);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=laporan-keuangan-${body.start}-sd-${body.end}.pdf`);
    res.end(pdfBuffer);
  }

  @Post('export/email')
  @ApiOperation({ summary: 'Generate laporan PDF dan kirim ke email' })
  @ApiBody({ type: ExportEmailDto })
  @ApiResponse({ status: 201, description: 'Laporan berhasil dikirim ke email.', schema: { example: { status: 'sent', email: 'admin@example.com' } } })
  async exportPdfEmail(@Body() body: ExportEmailDto) {
    return this.service.exportPdfReportAndSendEmail(body.start, body.end, body.email);
  }
}
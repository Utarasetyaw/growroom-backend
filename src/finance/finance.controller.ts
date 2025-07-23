import {
  Controller, Get, Query, UseGuards, Post, Body, Res
} from '@nestjs/common';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { Response } from 'express';

@Controller('finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER, Role.ADMIN)
export class FinanceController {
  constructor(private readonly service: FinanceService) {}

  // Summary endpoints
  @Get('summary/today')
  summaryToday() {
    return this.service.summaryToday();
  }

  @Get('summary/week')
  summaryWeek() {
    return this.service.summaryWeek();
  }

  @Get('summary/month')
  summaryMonth() {
    return this.service.summaryMonth();
  }

  @Get('summary')
  summaryRange(
    @Query('start') start: string,
    @Query('end') end: string
  ) {
    return this.service.summaryRange(start, end);
  }

  @Get('chart')
  chart(
    @Query('mode') mode: 'day' | 'week' | 'month' = 'day',
    @Query('start') start: string,
    @Query('end') end: string
  ) {
    return this.service.chart(mode, start, end);
  }

  // --- Export PDF (Download) ---
  @Post('export/pdf')
  async exportPdf(
    @Body() body: { start: string; end: string },
    @Res() res: Response,
  ) {
    const pdfBuffer = await this.service.generatePdfReport(body.start, body.end);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=laporan-keuangan-${body.start}-sd-${body.end}.pdf`);
    res.end(pdfBuffer);
  }

  // --- Export PDF + Kirim Email ---
  @Post('export/email')
  async exportPdfEmail(
    @Body() body: { start: string; end: string; email: string }
  ) {
    return this.service.exportPdfReportAndSendEmail(body.start, body.end, body.email);
  }
}

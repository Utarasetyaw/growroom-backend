import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, eachMonthOfInterval, eachWeekOfInterval, format
} from 'date-fns';
import * as PDFDocument from 'pdfkit';
import { sendEmailWithAttachment } from '../utils/mailer.util';

@Injectable()
export class FinanceService {
  constructor(private prisma: PrismaService) {}

  // === Summary methods ===
  async getSummary(start: Date, end: Date) {
    const [paid, failed, all] = await Promise.all([
      this.prisma.order.aggregate({
        _sum: { total: true },
        _count: true,
        where: {
          paymentStatus: 'PAID',
          createdAt: { gte: start, lte: end },
        }
      }),
      this.prisma.order.aggregate({
        _sum: { total: true },
        _count: true,
        where: {
          paymentStatus: { in: ['CANCELLED', 'REFUND'] },
          createdAt: { gte: start, lte: end },
        }
      }),
      this.prisma.order.count({ where: { createdAt: { gte: start, lte: end } } })
    ]);
    return {
      omset: paid._sum.total || 0,
      pesananBerhasil: paid._count,
      pesananGagal: failed._count,
      pesananSemua: all
    }
  }

  async summaryToday() {
    const start = startOfDay(new Date());
    const end = endOfDay(new Date());
    return this.getSummary(start, end);
  }

  async summaryWeek() {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 }); // Senin
    const end = endOfWeek(new Date(), { weekStartsOn: 1 });
    return this.getSummary(start, end);
  }

  async summaryMonth() {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    return this.getSummary(start, end);
  }

  async summaryRange(startStr: string, endStr: string) {
    const start = startOfDay(new Date(startStr));
    const end = endOfDay(new Date(endStr));
    return this.getSummary(start, end);
  }

  // === Grafik Omset ===
  async chart(mode: 'day' | 'week' | 'month', startStr: string, endStr: string) {
    const start = startOfDay(new Date(startStr));
    const end = endOfDay(new Date(endStr));
    let labels: string[] = [];
    if (mode === 'day') {
      labels = eachDayOfInterval({ start, end }).map(date => format(date, 'yyyy-MM-dd'));
    } else if (mode === 'week') {
      labels = eachWeekOfInterval({ start, end }, { weekStartsOn: 1 }).map(date => format(date, 'yyyy-ww'));
    } else {
      labels = eachMonthOfInterval({ start, end }).map(date => format(date, 'yyyy-MM'));
    }
    const data = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT
        TO_CHAR("createdAt", '${mode === 'day' ? 'YYYY-MM-DD' : mode === 'week' ? 'IYYY-IW' : 'YYYY-MM'}') as label,
        SUM("total") as omset,
        COUNT(*) as count
      FROM "Order"
      WHERE "createdAt" >= $1 AND "createdAt" <= $2 AND "paymentStatus" = 'PAID'
      GROUP BY label
      ORDER BY label
    `, start, end);

    // Format result agar urut dan lengkap
    return labels.map(label => {
      const found = data.find(d => d.label === label);
      return {
        label,
        omset: found ? Number(found.omset) : 0,
        count: found ? Number(found.count) : 0,
      }
    });
  }

  // === Generate PDF (Buffer) ===
  async generatePdfReport(startStr: string, endStr: string): Promise<Buffer> {
    const summary = await this.summaryRange(startStr, endStr);

    const doc = new PDFDocument();
    const buffers: Buffer[] = [];
    doc.on('data', (d) => buffers.push(d));
    doc.fontSize(18).text('Laporan Keuangan GlowRoom', { align: 'center' });
    doc.moveDown()
      .fontSize(12)
      .text(`Periode: ${startStr} - ${endStr}`)
      .moveDown()
      .text(`Omzet        : Rp${summary.omset.toLocaleString()}`)
      .text(`Pesanan Sukses: ${summary.pesananBerhasil}`)
      .text(`Pesanan Gagal : ${summary.pesananGagal}`)
      .text(`Total Pesanan : ${summary.pesananSemua}`);
    doc.end();
    await new Promise((res) => doc.on('end', res));
    return Buffer.concat(buffers);
  }

  // === Generate PDF & Send to Email ===
  async exportPdfReportAndSendEmail(startStr: string, endStr: string, email: string) {
    const pdfBuffer = await this.generatePdfReport(startStr, endStr);
    await sendEmailWithAttachment(
      email,
      'Laporan Keuangan GlowRoom',
      `Laporan keuangan periode ${startStr} - ${endStr} terlampir.`,
      pdfBuffer
    );
    return { status: 'sent', email };
  }
}

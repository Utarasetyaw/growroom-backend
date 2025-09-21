import { Injectable, BadRequestException, Logger } from '@nestjs/common'; // <-- 1. Import Logger
import { PrismaService } from '../prisma/prisma.service';
import {
  startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, eachMonthOfInterval, eachWeekOfInterval, format, isValid
} from 'date-fns';
import { sendEmailWithAttachment } from '../utils/mailer.util';
import { PdfService } from '../pdf/pdf.service';

@Injectable()
export class FinanceService {
  // --- 2. Inisialisasi Logger ---
  private readonly logger = new Logger(FinanceService.name);

  constructor(
    private prisma: PrismaService,
    private pdfService: PdfService,
  ) {}

  async getSummary(start: Date, end: Date) {
    this.logger.log('Menjalankan agregasi database untuk ringkasan...');
    const [paid, failed, all] = await Promise.all([
      this.prisma.order.aggregate({ _sum: { total: true }, _count: true, where: { paymentStatus: 'PAID', createdAt: { gte: start, lte: end } } }),
      this.prisma.order.aggregate({ _count: true, where: { paymentStatus: { in: ['CANCELLED', 'REFUNDED'] }, createdAt: { gte: start, lte: end } } }),
      this.prisma.order.count({ where: { createdAt: { gte: start, lte: end } } }),
    ]);
    this.logger.log('Agregasi ringkasan berhasil.');
    return {
      omset: paid._sum.total || 0,
      pesananBerhasil: paid._count,
      pesananGagal: failed._count,
      pesananSemua: all,
    };
  }
  
  async summaryRange(startStr: string, endStr: string) {
    this.logger.log(`Memulai summaryRange untuk periode: ${startStr} - ${endStr}`);
    try {
      this.validateDateInputs(startStr, endStr);
      const start = startOfDay(new Date(startStr));
      const end = endOfDay(new Date(endStr));
      return this.getSummary(start, end);
    } catch (error) {
      this.logger.error(`Error pada summaryRange: ${error.message}`, error.stack);
      throw error;
    }
  }

  async chart(mode: 'day' | 'week' | 'month', startStr: string, endStr: string) {
    this.logger.log(`Memulai pembuatan data chart untuk mode: ${mode}, periode: ${startStr} - ${endStr}`);
    try {
        this.validateDateInputs(startStr, endStr);
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

        this.logger.log('Menjalankan query mentah untuk data chart...');
        const data = await this.prisma.$queryRawUnsafe<any[]>(`
          SELECT
            TO_CHAR("createdAt", '${mode === 'day' ? 'YYYY-MM-DD' : mode === 'week' ? 'IYYY-IW' : 'YYYY-MM'}') as label,
            COALESCE(SUM("total"), 0) as omset,
            COUNT(*) as count
          FROM "Order"
          WHERE "createdAt" >= $1 AND "createdAt" <= $2 AND "paymentStatus" = 'PAID'
          GROUP BY label
          ORDER BY label
        `, start, end);
        
        this.logger.log(`Query chart berhasil, ditemukan ${data.length} baris data. Memformat hasil...`);
        return labels.map(label => {
          const found = data.find(d => d.label === label);
          return {
            label,
            omset: found ? Number(found.omset) : 0,
            count: found ? Number(found.count) : 0,
          };
        });
    } catch (error) {
        this.logger.error(`Error pada method chart: ${error.message}`, error.stack);
        throw error;
    }
  }

  async generatePdfReport(startStr: string, endStr: string): Promise<Buffer> {
    this.logger.log(`Memulai pembuatan laporan PDF untuk periode: ${startStr} - ${endStr}`);
    try {
      const summaryData = await this.summaryRange(startStr, endStr);
      const pdfBuffer = await this.pdfService.generateFinanceReportPdf(summaryData, startStr, endStr);
      this.logger.log('Laporan PDF berhasil dibuat.');
      return pdfBuffer;
    } catch (error) {
      this.logger.error(`Gagal membuat laporan PDF: ${error.message}`, error.stack);
      throw error;
    }
  }

  async exportPdfReportAndSendEmail(startStr: string, endStr: string, email: string) {
    this.logger.log(`Memulai proses ekspor PDF ke email: ${email} untuk periode: ${startStr} - ${endStr}`);
    try {
      const pdfBuffer = await this.generatePdfReport(startStr, endStr);
      const filename = `laporan-keuangan-${startStr}-sd-${endStr}.pdf`;
      
      this.logger.log('Mengirim email dengan lampiran PDF...');
      await sendEmailWithAttachment(
        email,
        'Laporan Keuangan',
        `Terlampir laporan keuangan untuk periode ${startStr} - ${endStr}.`,
        pdfBuffer,
        filename,
      );
      this.logger.log(`Email berhasil dikirim ke: ${email}`);
      return { status: 'sent', email };
    } catch (error) {
        this.logger.error(`Gagal mengirim email laporan: ${error.message}`, error.stack);
        throw error;
    }
  }
  
  private validateDateInputs(startStr: string, endStr: string) {
    if (!startStr || !endStr || !isValid(new Date(startStr)) || !isValid(new Date(endStr))) {
      throw new BadRequestException('Format tanggal mulai atau tanggal akhir tidak valid.');
    }
  }
}
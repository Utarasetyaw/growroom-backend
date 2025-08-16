import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderResponseDto } from '../orders/dto/order-response.dto';
import * as PDFDocument from 'pdfkit';
import axios from 'axios';

// Definisikan tipe data untuk laporan keuangan agar lebih jelas
interface FinanceReportData {
  omset: number;
  pesananBerhasil: number;
  pesananGagal: number;
  pesananSemua: number;
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Membuat PDF invoice dengan tampilan profesional.
   */
  async generateInvoicePdf(order: OrderResponseDto): Promise<Buffer> {
    const settings = await this.prisma.generalSetting.findUnique({ where: { id: 1 } });

    return new Promise(async (resolve) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      await this.generateHeader(doc, settings);
      this.generateCustomerInformation(doc, order);
      this.generateInvoiceTable(doc, order);
      this.generateFooter(doc, settings);

      doc.end();
    });
  }

  /**
   * Membuat PDF laporan keuangan dengan tampilan profesional.
   */
  async generateFinanceReportPdf(summary: FinanceReportData, startStr: string, endStr: string): Promise<Buffer> {
    const settings = await this.prisma.generalSetting.findUnique({ where: { id: 1 } });
    
    return new Promise(async (resolve) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      await this.generateHeader(doc, settings);
      this.generateReportTitle(doc, startStr, endStr);
      this.generateReportBody(doc, summary);
      this.generateFooter(doc, settings);

      doc.end();
    });
  }

  /**
   * Membuat bagian header dokumen dengan logo dan detail perusahaan.
   */
  private async generateHeader(doc: PDFKit.PDFDocument, settings: any) {
    const shopName = settings?.shopName?.id || settings?.shopName?.en || 'Nama Toko Anda';

    // --- SISI KIRI: Informasi Perusahaan ---
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(shopName, 50, 45)
      .fontSize(10)
      .font('Helvetica')
      .text(settings?.address || 'Alamat Perusahaan', 50, 70)
      .text(`${settings?.email || 'email@perusahaan.com'} | ${settings?.phoneNumber || '08xx-xxxx-xxxx'}`, 50, 85)
      .moveDown();

    // --- SISI KANAN: Logo Perusahaan ---
    if (settings?.logoUrl) {
      try {
        const response = await axios.get(settings.logoUrl, { responseType: 'arraybuffer' });
        const logoBuffer = Buffer.from(response.data, 'binary');
        // Kalkulasi posisi X agar logo berada di pojok kanan
        // Lebar halaman A4 (595) - margin kanan (50) - lebar logo (50) = 495
        doc.image(logoBuffer, 495, 45, { width: 50 });
      } catch (error) {
        this.logger.error('Gagal mengambil gambar logo.', error.stack);
      }
    }
  }

  /**
   * Membuat bagian informasi pelanggan dan detail invoice.
   */
  private generateCustomerInformation(doc: PDFKit.PDFDocument, order: OrderResponseDto) {
    doc.fillColor('#444444').fontSize(20).font('Helvetica-Bold').text('INVOICE', 50, 160);
    this.generateHr(doc, 185);

    const customerInfoTop = 200;
    doc
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('Ditagihkan Kepada:', 50, customerInfoTop)
      .font('Helvetica')
      .text(order.user?.name || 'N/A', 50, customerInfoTop + 15)
      .text(order.address, 50, customerInfoTop + 30)
      .text(order.user?.email || '', 50, customerInfoTop + 45)

      .font('Helvetica-Bold')
      .text('Invoice No:', 350, customerInfoTop)
      .font('Helvetica')
      .text(`${order.id}`, 450, customerInfoTop)
      
      .font('Helvetica-Bold')
      .text('Tanggal Terbit:', 350, customerInfoTop + 15)
      .font('Helvetica')
      .text(new Date(order.createdAt).toLocaleDateString('id-ID'), 450, customerInfoTop + 15)

      .font('Helvetica-Bold')
      .text('Status:', 350, customerInfoTop + 30)
      .font('Helvetica')
      .text(order.paymentStatus, 450, customerInfoTop + 30)
      .moveDown();
  }

  /**
   * Membuat tabel rincian item pada invoice.
   */
  private generateInvoiceTable(doc: PDFKit.PDFDocument, order: OrderResponseDto) {
    let i = 0;
    const invoiceTableTop = 330;
    const currency = order.currencyCode;

    doc.font('Helvetica-Bold');
    this.generateTableRow(doc, invoiceTableTop, 'Produk', 'Kuantitas', 'Harga Satuan', 'Total');
    this.generateHr(doc, invoiceTableTop + 20);
    doc.font('Helvetica');

    for (const item of order.orderItems) {
      const position = invoiceTableTop + (i + 1) * 30;
      const name = (item.productName as any)?.id || (item.productName as any)?.en || 'Produk Dihapus';
      
      this.generateTableRow(
        doc,
        position,
        name,
        item.qty.toString(),
        this.formatCurrency(item.price, currency),
        this.formatCurrency(item.subtotal, currency),
      );
      this.generateHr(doc, position + 20);
      i++;
    }

    const subtotalPosition = invoiceTableTop + i * 30 + 30;
    this.generateTableRow(doc, subtotalPosition, '', '', 'Subtotal', this.formatCurrency(order.subtotal, currency));

    const shippingPosition = subtotalPosition + 20;
    this.generateTableRow(doc, shippingPosition, '', '', 'Biaya Kirim', this.formatCurrency(order.shippingCost, currency));
    
    const totalPosition = shippingPosition + 30;
    doc.font('Helvetica-Bold');
    this.generateTableRow(doc, totalPosition, '', '', 'Total Akhir', this.formatCurrency(order.total, currency));
    doc.font('Helvetica');
  }

  /**
   * Membuat judul untuk laporan keuangan.
   */
  private generateReportTitle(doc: PDFKit.PDFDocument, startStr: string, endStr: string) {
    doc.fillColor('#444444').fontSize(20).font('Helvetica-Bold').text('Laporan Keuangan', 50, 160);
    doc.fontSize(12).font('Helvetica').text(`Periode: ${startStr} - ${endStr}`);
    this.generateHr(doc, 205);
  }

  /**
   * Membuat isi laporan keuangan.
   */
  private generateReportBody(doc: PDFKit.PDFDocument, summary: FinanceReportData) {
    const reportBodyTop = 230;
    doc.font('Helvetica-Bold').fontSize(14).text('Ringkasan Pendapatan', 50, reportBodyTop);

    const data = [
      { label: 'Total Omzet', value: this.formatCurrency(summary.omset, 'IDR') },
      { label: 'Pesanan Berhasil', value: summary.pesananBerhasil.toString() },
      { label: 'Pesanan Gagal/Batal', value: summary.pesananGagal.toString() },
      { label: 'Total Semua Pesanan', value: summary.pesananSemua.toString() },
    ];

    data.forEach((item, index) => {
      const y = reportBodyTop + 30 + index * 25;
      doc.fontSize(11).font('Helvetica').text(item.label, 70, y);
      doc.font('Helvetica-Bold').text(item.value, 250, y);
    });
  }

  /**
   * Membuat footer di bagian bawah halaman.
   */
  private generateFooter(doc: PDFKit.PDFDocument, settings: any) {
    this.generateHr(doc, 750, 50, 512);
    const shopName = settings?.shopName?.id || settings?.shopName?.en || 'toko kami';
    doc
      .fontSize(10)
      .text(
        `Terima kasih telah berbelanja di ${shopName}.`,
        50,
        760,
        { align: 'center', width: 500 },
      );
  }

  // --- Helper Utilitas ---

  private generateTableRow(doc: PDFKit.PDFDocument, y: number, item: string, qty: string, unitCost: string, lineTotal: string) {
    doc
      .fontSize(10)
      .text(item, 50, y, { width: 200 })
      .text(qty, 280, y, { width: 90, align: 'right' })
      .text(unitCost, 370, y, { width: 90, align: 'right' })
      .text(lineTotal, 0, y, { align: 'right' });
  }

  private generateHr(doc: PDFKit.PDFDocument, y: number, x1 = 50, x2 = 550) {
    doc.strokeColor('#aaaaaa').lineWidth(1).moveTo(x1, y).lineTo(x2, y).stroke();
  }

  private formatCurrency(value: number, currency: string) {
    return value.toLocaleString('id-ID', { style: 'currency', currency: currency });
  }
}
// src/pdf/pdf.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderResponseDto } from '../orders/dto/order-response.dto';
import * as PDFDocument from 'pdfkit';
import * as fs from 'fs';
import * as path from 'path';

const translations = {
  en: {
    INVOICE: 'INVOICE',
    BILLED_TO: 'Billed To:',
    INVOICE_NO: 'Invoice No:',
    DATE_ISSUED: 'Date Issued:',
    STATUS: 'Status:',
    PRODUCT: 'Product',
    QUANTITY: 'Quantity',
    UNIT_PRICE: 'Unit Price',
    TOTAL: 'Total',
    SUBTOTAL: 'Subtotal',
    SALE_DISCOUNT: 'Sale Discount', // <-- TAMBAHAN
    VOUCHER_DISCOUNT: 'Voucher Discount', // <-- TAMBAHAN
    SHIPPING_FEE: 'Shipping Fee',
    GRAND_TOTAL: 'Grand Total',
    THANK_YOU: 'Thank you for your purchase.',
    FINANCE_REPORT: 'Financial Report',
    PERIOD: 'Period:',
    SUMMARY: 'Revenue Summary',
    TOTAL_REVENUE: 'Total Revenue',
    SUCCESSFUL_ORDERS: 'Successful Orders',
    FAILED_ORDERS: 'Failed/Cancelled Orders',
    TOTAL_ORDERS: 'Total All Orders',
  },
  id: {
    INVOICE: 'INVOICE',
    BILLED_TO: 'Ditagihkan Kepada:',
    INVOICE_NO: 'Invoice No:',
    DATE_ISSUED: 'Tanggal Terbit:',
    STATUS: 'Status:',
    PRODUCT: 'Produk',
    QUANTITY: 'Kuantitas',
    UNIT_PRICE: 'Harga Satuan',
    TOTAL: 'Total',
    SUBTOTAL: 'Subtotal',
    SALE_DISCOUNT: 'Diskon Penjualan', // <-- TAMBAHAN
    VOUCHER_DISCOUNT: 'Diskon Voucher', // <-- TAMBAHAN
    SHIPPING_FEE: 'Biaya Kirim',
    GRAND_TOTAL: 'Total Akhir',
    THANK_YOU: 'Terima kasih telah berbelanja di toko kami.',
    FINANCE_REPORT: 'Laporan Keuangan',
    PERIOD: 'Periode:',
    SUMMARY: 'Ringkasan Pendapatan',
    TOTAL_REVENUE: 'Total Omzet',
    SUCCESSFUL_ORDERS: 'Pesanan Berhasil',
    FAILED_ORDERS: 'Pesanan Gagal/Batal',
    TOTAL_ORDERS: 'Total Semua Pesanan',
  },
};

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

  async generateInvoicePdf(order: OrderResponseDto, lang: 'en' | 'id'): Promise<Buffer> {
    const settings = await this.prisma.generalSetting.findUnique({ where: { id: 1 } });
    const T = translations[lang];

    return new Promise(async (resolve) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      await this.generateHeader(doc, settings, lang);
      this.generateCustomerInformation(doc, order, T, lang);
      this.generateInvoiceTable(doc, order, T, lang); // Method ini akan kita revisi
      this.generateFooter(doc, settings, T);

      doc.end();
    });
  }

  async generateFinanceReportPdf(summary: FinanceReportData, startStr: string, endStr: string): Promise<Buffer> {
    const settings = await this.prisma.generalSetting.findUnique({ where: { id: 1 } });
    const T = translations['id'];

    return new Promise(async (resolve) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const buffers: Buffer[] = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      await this.generateHeader(doc, settings, 'id');
      this.generateReportTitle(doc, startStr, endStr, T);
      this.generateReportBody(doc, summary, T);
      this.generateFooter(doc, settings, T);

      doc.end();
    });
  }

  private async generateHeader(doc: PDFKit.PDFDocument, settings: any, lang: 'en' | 'id') {
    const shopName = settings?.shopName?.[lang] || settings?.shopName?.en || 'Your Shop Name';

    doc
      .fontSize(20).font('Helvetica-Bold').text(shopName, 50, 45)
      .fontSize(10).font('Helvetica').text(settings?.address || 'Company Address', 50, 70)
      .text(`${settings?.email || 'email@company.com'} | ${settings?.phoneNumber || '08xx-xxxx-xxxx'}`, 50, 85)
      .moveDown();

    if (settings?.logoUrl) {
      try {
        const logoPath = path.join(process.cwd(), settings.logoUrl);
        if (fs.existsSync(logoPath)) {
            doc.image(logoPath, 495, 45, { width: 50 });
        } else {
            this.logger.warn(`Logo file not found at path: ${logoPath}`);
        }
      } catch (error) {
        this.logger.error(`Failed to read logo file: ${settings.logoUrl}.`, error.message);
      }
    }
  }

  private generateCustomerInformation(doc: PDFKit.PDFDocument, order: OrderResponseDto, T: any, lang: 'en' | 'id') {
    doc.fillColor('#444444').fontSize(20).font('Helvetica-Bold').text(T.INVOICE, 50, 160);
    this.generateHr(doc, 185);

    const customerInfoTop = 200;
    
    const addressObject = this.parseAddress(order.address);
    const addressLines = [
        addressObject.name,
        addressObject.phone,
        addressObject.street,
        `${addressObject.city}, ${addressObject.province} ${addressObject.postalCode}`,
        addressObject.country
    ].filter(Boolean);

    doc.fontSize(10).font('Helvetica-Bold').text(T.BILLED_TO, 50, customerInfoTop);
    
    let currentY = customerInfoTop;
    addressLines.forEach(line => {
        currentY += 15;
        doc.font('Helvetica').text(line, 50, currentY);
    });

    doc
      .font('Helvetica-Bold').text(T.INVOICE_NO, 350, customerInfoTop)
      .font('Helvetica').text(`${order.id}`, 450, customerInfoTop)
      
      .font('Helvetica-Bold').text(T.DATE_ISSUED, 350, customerInfoTop + 15)
      .font('Helvetica').text(new Date(order.createdAt).toLocaleDateString(lang === 'id' ? 'id-ID' : 'en-US'), 450, customerInfoTop + 15)

      .font('Helvetica-Bold').text(T.STATUS, 350, customerInfoTop + 30)
      .font('Helvetica').text(order.paymentStatus, 450, customerInfoTop + 30)
      .moveDown();
  }
  
  // --- REVISI UTAMA DI SINI ---
  private generateInvoiceTable(doc: PDFKit.PDFDocument, order: OrderResponseDto, T: any, lang: 'en' | 'id') {
    const invoiceTableTop = 330;
    const currency = order.currencyCode;

    doc.font('Helvetica-Bold');
    this.generateTableRow(doc, invoiceTableTop, T.PRODUCT, T.QUANTITY, T.UNIT_PRICE, T.TOTAL);
    this.generateHr(doc, invoiceTableTop + 20);
    doc.font('Helvetica');

    let i = 0;
    for (const item of order.orderItems) {
      const position = invoiceTableTop + (i + 1) * 30;
      const name = item.productName?.[lang] || item.productName?.['en'] || 'Product Removed';
      
      this.generateTableRow(
        doc,
        position,
        name,
        item.qty.toString(),
        this.formatCurrency(item.price, currency, lang),
        this.formatCurrency(item.subtotal, currency, lang),
      );
      this.generateHr(doc, position + 20);
      i++;
    }

    // Mengatur posisi awal untuk summary
    let summaryPosition = invoiceTableTop + (i + 1) * 30;

    // Menampilkan Subtotal
    this.generateTableRow(doc, summaryPosition, '', '', T.SUBTOTAL, this.formatCurrency(order.subtotal, currency, lang));

    // Menampilkan Diskon Penjualan (jika ada)
    if (order.saleDiscountAmount > 0) {
      summaryPosition += 20; // Turun satu baris
      doc.fillColor('#E67E22'); // Beri warna berbeda untuk diskon
      this.generateTableRow(doc, summaryPosition, '', '', T.SALE_DISCOUNT, `- ${this.formatCurrency(order.saleDiscountAmount, currency, lang)}`);
      doc.fillColor('#444444'); // Kembalikan ke warna default
    }
    
    // Menampilkan Diskon Voucher (jika ada)
    if (order.voucherDiscountAmount > 0) {
      const voucherInfo = order.appliedDiscounts.find(d => d.discountType === 'VOUCHER');
      const voucherLabel = voucherInfo ? `${T.VOUCHER_DISCOUNT} (${voucherInfo.discountName})` : T.VOUCHER_DISCOUNT;
      
      summaryPosition += 20; // Turun satu baris
      doc.fillColor('#2ECC71'); // Beri warna berbeda untuk voucher
      this.generateTableRow(doc, summaryPosition, '', '', voucherLabel, `- ${this.formatCurrency(order.voucherDiscountAmount, currency, lang)}`);
      doc.fillColor('#444444'); // Kembalikan ke warna default
    }

    // Menampilkan Biaya Kirim
    summaryPosition += 20;
    this.generateTableRow(doc, summaryPosition, '', '', T.SHIPPING_FEE, this.formatCurrency(order.shippingCost, currency, lang));
    
    // Menampilkan Total Akhir
    summaryPosition += 30; // Beri jarak lebih sebelum total
    doc.font('Helvetica-Bold');
    this.generateTableRow(doc, summaryPosition, '', '', T.GRAND_TOTAL, this.formatCurrency(order.total, currency, lang));
    doc.font('Helvetica');
  }

  private generateReportTitle(doc: PDFKit.PDFDocument, startStr: string, endStr: string, T: any) {
    doc.fillColor('#444444').fontSize(20).font('Helvetica-Bold').text(T.FINANCE_REPORT, 50, 160);
    doc.fontSize(12).font('Helvetica').text(`${T.PERIOD} ${startStr} - ${endStr}`);
    this.generateHr(doc, 205);
  }

  private generateReportBody(doc: PDFKit.PDFDocument, summary: FinanceReportData, T: any) {
    const reportBodyTop = 230;
    doc.font('Helvetica-Bold').fontSize(14).text(T.SUMMARY, 50, reportBodyTop);

    const data = [
      { label: T.TOTAL_REVENUE, value: this.formatCurrency(summary.omset, 'IDR', 'id') },
      { label: T.SUCCESSFUL_ORDERS, value: summary.pesananBerhasil.toString() },
      { label: T.FAILED_ORDERS, value: summary.pesananGagal.toString() },
      { label: T.TOTAL_ORDERS, value: summary.pesananSemua.toString() },
    ];

    data.forEach((item, index) => {
      const y = reportBodyTop + 30 + index * 25;
      doc.fontSize(11).font('Helvetica').text(item.label, 70, y);
      doc.font('Helvetica-Bold').text(item.value, 250, y);
    });
  }

  private generateFooter(doc: PDFKit.PDFDocument, settings: any, T: any) {
    this.generateHr(doc, 750, 50, 512);
    doc.fontSize(10).text(T.THANK_YOU, 50, 760, { align: 'center', width: 500 });
  }

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

  private formatCurrency(value: number, currency: string, lang: 'en' | 'id') {
    const locale = lang === 'id' ? 'id-ID' : 'en-US';
    return value.toLocaleString(locale, { style: 'currency', currency: currency, minimumFractionDigits: 2 });
  }

  private parseAddress(addressString: string): { [key: string]: string } {
    try {
      const parsed = JSON.parse(addressString);
      return {
        name: parsed.name || '',
        phone: parsed.phone || '',
        street: parsed.street || '',
        district: parsed.district || '',
        city: parsed.city || '',
        province: parsed.province || '',
        country: parsed.country || '',
        postalCode: parsed.postalCode || '',
      };
    } catch (e) {
      return { name: addressString, phone: '', street: '', district: '', city: '', province: '', country: '', postalCode: '' };
    }
  }
}
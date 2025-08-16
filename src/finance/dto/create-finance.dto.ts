import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  IsEnum,
  IsOptional,
  IsDateString,
  MaxLength,
} from 'class-validator';

/**
 * Enum untuk menentukan jenis transaksi keuangan.
 * EXPENSE: Pengeluaran (misal: biaya iklan, gaji, pembelian stok).
 * INCOME: Pemasukan (misal: penjualan offline, pendapatan lain).
 */
export enum FinanceTransactionType {
  EXPENSE = 'EXPENSE',
  INCOME = 'INCOME',
}

export class CreateFinanceDto {
  @ApiProperty({
    description: 'Judul atau deskripsi singkat dari transaksi keuangan.',
    example: 'Biaya Iklan Google Agustus 2025',
  })
  @IsString()
  @IsNotEmpty({ message: 'Judul tidak boleh kosong.' })
  @MaxLength(100)
  title: string;

  @ApiProperty({
    description: 'Jumlah nominal transaksi dalam mata uang dasar (misal: IDR).',
    example: 1500000,
  })
  @IsNumber({}, { message: 'Jumlah harus berupa angka.' })
  @Min(1, { message: 'Jumlah minimal adalah 1.' })
  amount: number;

  @ApiProperty({
    description: 'Jenis transaksi (pengeluaran atau pemasukan).',
    enum: FinanceTransactionType,
    example: FinanceTransactionType.EXPENSE,
  })
  @IsEnum(FinanceTransactionType, { message: 'Tipe transaksi tidak valid.' })
  type: FinanceTransactionType;

  @ApiPropertyOptional({
    description: 'Kategori untuk pengelompokan (opsional, misal: Marketing, Operasional, Gaji).',
    example: 'Marketing',
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @ApiPropertyOptional({
    description: 'Tanggal transaksi (format YYYY-MM-DD). Jika kosong, akan menggunakan tanggal saat ini.',
    example: '2025-08-16',
  })
  @IsOptional()
  @IsDateString({}, { message: 'Format tanggal harus YYYY-MM-DD.' })
  transactionDate?: string;
}
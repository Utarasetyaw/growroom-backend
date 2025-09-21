// File: src/discounts/dto/create-discount.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsEnum, IsNumber, Min, IsDate, IsArray, IsInt,
  ArrayNotEmpty, IsOptional, ValidateIf, IsBoolean, IsObject
} from 'class-validator';
import { Type } from 'class-transformer';
import { DiscountType, DiscountValueType } from '@prisma/client';

export class CreateDiscountDto {
  @ApiProperty({ description: 'Nama promo/diskon', example: 'Promo Gajian September' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ description: 'Deskripsi singkat promo', example: 'Diskon spesial untuk semua produk Anthurium' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ enum: DiscountType, description: 'Tipe diskon: SALE (harga coret) atau VOUCHER (kode)' })
  @IsEnum(DiscountType)
  @IsNotEmpty()
  type: DiscountType;

  @ApiProperty({ enum: DiscountValueType, description: 'Jenis nilai diskon: PERCENTAGE atau FIXED' })
  @IsEnum(DiscountValueType)
  @IsNotEmpty()
  discountType: DiscountValueType;

  @ApiProperty({
    description: 'Nilai diskon. Angka untuk PERCENTAGE, objek JSON untuk FIXED. Cth: 15 atau {"USD":10, "IDR":150000}',
    example: 15
  })
  @IsNotEmpty()
  @ValidateIf(o => o.discountType === DiscountValueType.PERCENTAGE)
  @IsNumber({}, { message: 'Nilai diskon harus berupa angka untuk tipe Persen' })
  @ValidateIf(o => o.discountType === DiscountValueType.FIXED)
  @IsObject({ message: 'Nilai diskon harus berupa objek untuk tipe Harga Tetap' })
  value: any;

  @ApiProperty({ description: 'Tanggal mulai promo', example: '2025-09-25T00:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  startDate: Date;

  @ApiProperty({ description: 'Tanggal berakhir promo', example: '2025-09-30T23:59:59.000Z' })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  endDate: Date;

  @ApiPropertyOptional({ description: 'Batas maksimal penggunaan promo per user', example: 1, required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxUsesPerUser?: number;

  @ApiPropertyOptional({ description: 'Apakah promo ini aktif?', default: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({ description: 'Array berisi ID produk yang termasuk dalam promo ini', type: [Number], example: [1, 5, 12] })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  productIds: number[];

  // --- REVISI: Kolom spesifik untuk tipe VOUCHER ---

  @ApiPropertyOptional({ description: 'Kode voucher unik (wajib jika tipe VOUCHER)', example: 'GAJIAN10' })
  @ValidateIf(o => o.type === DiscountType.VOUCHER)
  @IsString()
  @IsNotEmpty({ message: 'Kode voucher harus diisi jika tipe diskon adalah VOUCHER' })
  voucherCode?: string;

  @ApiPropertyOptional({ description: 'Total kuota penggunaan voucher (opsional)', example: 100 })
  @ValidateIf(o => o.type === DiscountType.VOUCHER)
  @IsInt()
  @Min(1)
  @IsOptional()
  maxUses?: number;
}
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsEnum, IsNumber, Min, IsDate, IsArray, IsInt,
  ArrayNotEmpty, IsOptional, ValidateIf
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
  type: DiscountType;

  @ApiProperty({ enum: DiscountValueType, description: 'Jenis nilai diskon: PERCENTAGE atau FIXED' })
  @IsEnum(DiscountValueType)
  discountType: DiscountValueType;

  @ApiProperty({ description: 'Nilai diskon (cth: 15 untuk 15% atau 50000 untuk potongan Rp 50.000)', example: 15 })
  @IsNumber()
  @Min(0)
  value: number;

  @ApiProperty({ description: 'Tanggal mulai promo', example: '2025-09-25T00:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  startDate: Date;

  @ApiProperty({ description: 'Tanggal berakhir promo', example: '2025-09-30T23:59:59.000Z' })
  @Type(() => Date)
  @IsDate()
  endDate: Date;

  @ApiPropertyOptional({ description: 'Batas maksimal penggunaan promo per user', example: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxUsesPerUser?: number;

  @ApiProperty({ description: 'Array berisi ID produk yang termasuk dalam promo ini', type: [Number], example: [1, 5, 12] })
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  productIds: number[];

  @ApiPropertyOptional({ description: 'Jumlah voucher yang akan digenerate (wajib jika tipe VOUCHER)', example: 100 })
  @ValidateIf(o => o.type === 'VOUCHER')
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  voucherQuantity?: number;
  
  @ApiPropertyOptional({ description: 'Prefix untuk kode voucher (opsional)', example: 'GAJIAN' })
  @IsString()
  @IsOptional()
  voucherCodePrefix?: string;

  @ApiPropertyOptional({ description: 'Batas penggunaan per kode voucher (opsional)', example: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  voucherMaxUses?: number;
}
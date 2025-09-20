import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsEnum, IsNumber, Min, IsDate, IsArray, IsInt,
  ArrayNotEmpty, IsOptional, ValidateIf, IsBoolean
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

  @ApiProperty({ description: 'Nilai diskon (cth: 15 untuk 15% atau 50000 untuk potongan Rp 50.000)', example: 15 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  value: number;

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

  @ApiPropertyOptional({ description: 'Jumlah voucher yang akan digenerate (wajib jika tipe VOUCHER)', example: 100, required: false })
  @ValidateIf(o => o.type === 'VOUCHER')
  @IsInt()
  @Min(1)
  @IsNotEmpty({ message: 'Jumlah voucher harus diisi jika tipe diskon adalah VOUCHER' })
  voucherQuantity?: number;
  
  @ApiPropertyOptional({ description: 'Prefix untuk kode voucher (opsional)', example: 'GAJIAN', required: false })
  @IsString()
  @IsOptional()
  voucherCodePrefix?: string;

  @ApiPropertyOptional({ description: 'Batas penggunaan per kode voucher (opsional)', example: 1, required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  voucherMaxUses?: number;
}
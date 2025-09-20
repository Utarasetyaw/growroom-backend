import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString, IsNotEmpty, IsEnum, IsNumber, Min, IsDate, IsArray, IsInt,
  ArrayNotEmpty, IsOptional, ValidateIf, IsBoolean // <-- Impor IsBoolean
} from 'class-validator';
import { Type } from 'class-transformer';
import { DiscountType, DiscountValueType } from '@prisma/client';

export class CreateDiscountDto {
  // ... (properti lain tidak berubah)
  name: string;
  description?: string;
  type: DiscountType;
  discountType: DiscountValueType;
  value: number;
  startDate: Date;
  endDate: Date;
  
  @ApiPropertyOptional({ description: 'Batas maksimal penggunaan promo per user', example: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxUsesPerUser?: number;
  
  // --- TAMBAHKAN PROPERTI INI ---
  @ApiPropertyOptional({ description: 'Apakah promo ini aktif?', default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
  // -----------------------------

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
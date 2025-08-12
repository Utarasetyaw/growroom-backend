import { Type } from 'class-transformer';
import {
  IsString,
  IsObject,
  ValidateNested,
  IsArray,
  IsOptional,
} from 'class-validator';

// DTO untuk objek 'amount' yang ada di dalam resource
class PaypalAmountDto {
  @IsString()
  currency_code: string;

  @IsString()
  value: string;
}

// DTO untuk objek di dalam array 'purchase_units'
class PaypalPurchaseUnitDto {
  @IsString()
  reference_id: string; // Ini berisi ID Order internal kita, e.g., "ORDER-123"
}

// DTO untuk objek 'resource' utama
class PaypalResourceDto {
  @IsString()
  id: string; // ID dari capture atau transaksi PayPal

  @IsString()
  status: string;

  @IsObject()
  @ValidateNested()
  @Type(() => PaypalAmountDto)
  amount: PaypalAmountDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PaypalPurchaseUnitDto)
  purchase_units: PaypalPurchaseUnitDto[];
}

// DTO utama untuk seluruh payload webhook
export class PaypalWebhookDto {
  @IsString()
  id: string; // ID dari event webhook

  @IsString()
  event_type: string; // e.g., "PAYMENT.CAPTURE.COMPLETED"

  @IsObject()
  @ValidateNested()
  @Type(() => PaypalResourceDto)
  resource: PaypalResourceDto;

  @IsOptional()
  @IsString()
  summary?: string;
}
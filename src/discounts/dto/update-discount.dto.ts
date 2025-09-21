// File: src/discounts/dto/update-discount.dto.ts

import { PartialType } from '@nestjs/swagger';
import { CreateDiscountDto } from './create-discount.dto';

// Kelas ini secara otomatis mewarisi semua properti dari CreateDiscountDto
// dan menjadikannya opsional. Tidak perlu ada perubahan manual di sini.
export class UpdateDiscountDto extends PartialType(CreateDiscountDto) {}
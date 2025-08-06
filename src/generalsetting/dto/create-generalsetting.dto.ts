// src/generalsetting/dto/create-generalsetting.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class CreateGeneralsettingDto {
  // --- Properti yang sudah ada ---
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() faviconUrl?: string;
  @IsOptional() @IsString() bannerImageUrl?: string;
  @IsOptional() @IsString() bannerVideoUrl?: string;
  @IsOptional() shopName?: any; // Multilang: { id: 'Nama', en: 'Name', ... }
  @IsOptional() shopDescription?: any; // Multilang: { id: 'Deskripsi', en: 'Desc', ... }
  @IsOptional() @IsString() address?: string;
  @IsOptional() socialMedia?: any;

  // --- Properti Baru ---
  @IsOptional() @IsString() email?: string;
  @IsOptional() @IsString() phoneNumber?: string;
  @IsOptional() aboutItems?: any; // Format: [{ title: any, description: any }]
  @IsOptional() faqs?: any;       // Format: [{ question: any, answer: any }]
}
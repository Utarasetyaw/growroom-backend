// src/users/dto/update-my-profile.dto.ts

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

// DTO untuk objek socialMedia
class SocialMediaDto {
  @ApiPropertyOptional({ description: "Instagram username", example: "growroom.id" })
  @IsString()
  @IsOptional()
  instagram?: string;

  @ApiPropertyOptional({ description: "Facebook profile URL", example: "https://facebook.com/growroom" })
  @IsString()
  @IsOptional()
  facebook?: string;

  @ApiPropertyOptional({ description: "TikTok username", example: "@growroom" })
  @IsString()
  @IsOptional()
  tiktok?: string;

  @ApiPropertyOptional({ description: "Twitter handle", example: "growroom" })
  @IsString()
  @IsOptional()
  twitter?: string;
}

// DTO untuk objek address
class AddressDto {
    @ApiPropertyOptional({ description: "Nama jalan, gedung, dll." })
    @IsString()
    @IsOptional()
    street?: string;

    // --- PERBAIKAN DI SINI ---
    @ApiPropertyOptional({ description: "Kecamatan" })
    @IsString()
    @IsOptional()
    district?: string;

    @ApiPropertyOptional({ description: "Kota" })
    @IsString()
    @IsOptional()
    city?: string;

    @ApiPropertyOptional({ description: "Provinsi" })
    @IsString()
    @IsOptional()
    province?: string;

    @ApiPropertyOptional({ description: "Negara" })
    @IsString()
    @IsOptional()
    country?: string;

    @ApiPropertyOptional({ description: "Kode pos" })
    @IsString()
    @IsOptional()
    postalCode?: string;
}

// DTO utama untuk update profil
export class UpdateMyProfileDto {
  @ApiPropertyOptional({ description: "Nama lengkap pengguna" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Password baru.' })
  @IsOptional()
  @IsString()
  password?: string;

  @ApiPropertyOptional({ description: "Nomor telepon pengguna" })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ type: AddressDto, description: "Objek alamat pengguna" })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;

  @ApiPropertyOptional({ type: SocialMediaDto, description: "Akun media sosial pengguna" })
  @IsOptional()
  @ValidateNested()
  @Type(() => SocialMediaDto)
  socialMedia?: SocialMediaDto;
}

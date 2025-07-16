// src/generalsetting/dto/update-generalsetting.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class UpdateGeneralsettingDto {
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() faviconUrl?: string;
  @IsOptional() @IsString() bannerImageUrl?: string;
  @IsOptional() @IsString() bannerVideoUrl?: string;
  @IsOptional() shopName?: any;
  @IsOptional() shopDescription?: any;
  @IsOptional() @IsString() address?: string;
  @IsOptional() socialMedia?: any;
}

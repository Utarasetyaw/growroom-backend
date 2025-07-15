// src/generalsetting/dto/create-generalsetting.dto.ts
import { IsOptional, IsString } from 'class-validator';

export class CreateGeneralsettingDto {
  @IsOptional() @IsString() logoUrl?: string;
  @IsOptional() @IsString() faviconUrl?: string;
  @IsOptional() @IsString() bannerImageUrl?: string;
  @IsOptional() @IsString() bannerVideoUrl?: string;
  @IsOptional() @IsString() shopDescription?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() socialMedia?: any;
}

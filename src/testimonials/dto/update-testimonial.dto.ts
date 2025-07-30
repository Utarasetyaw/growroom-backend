import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class UpdateTestimonialDto {
  @ApiPropertyOptional({ description: 'Nama baru pemberi testimoni.' })
  @IsString()
  @IsOptional()
  author?: string;

  @ApiPropertyOptional({ description: 'Isi testimoni baru (bisa JSON string).' })
  @IsOptional()
  quote?: any;

  @ApiPropertyOptional({ description: 'Rating baru (1-5).' })
  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @ApiPropertyOptional({ description: 'URL gambar baru (jika tidak upload file baru).', example: '/uploads/testimonials/image.jpg' })
  @IsString()
  @IsOptional()
  imageUrl?: string;
}
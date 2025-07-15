// update-testimonial.dto.ts
import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class UpdateTestimonialDto {
  @IsString()
  @IsOptional()
  author?: string;

  @IsString()
  @IsOptional()
  quote?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}

import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class UpdateTestimonialDto {
  @IsString()
  @IsOptional()
  author?: string;

  @IsOptional()
  quote?: any; // JSON multilang

  @IsInt()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsString()
  @IsOptional()
  imageUrl?: string;
}
export class Testimonial {}

import { IsNotEmpty, IsInt, Min, Max, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTestimonialDto {
  @IsString()
  @IsNotEmpty()
  author: string;

  @IsNotEmpty()
  quote: any; // Bisa string atau object JSON multilang

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;
}

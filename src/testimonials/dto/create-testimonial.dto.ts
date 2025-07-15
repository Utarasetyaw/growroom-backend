import { IsNotEmpty, IsInt, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTestimonialDto {
  @IsString()
  @IsNotEmpty()
  author: string;

  @IsString()
  @IsNotEmpty()
  quote: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsInt, Min, Max, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTestimonialDto {
  @ApiProperty({ description: 'Nama pemberi testimoni.', example: 'Budi Santoso' })
  @IsString()
  @IsNotEmpty()
  author: string;

  @ApiProperty({
    description: 'Isi testimoni. Bisa berupa teks biasa atau JSON string untuk multi-bahasa.',
    example: '{"id": "Pelayanannya luar biasa!", "en": "The service is outstanding!"}',
  })
  @IsNotEmpty()
  quote: any;

  @ApiProperty({ description: 'Rating yang diberikan (1-5).', example: 5 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;
}
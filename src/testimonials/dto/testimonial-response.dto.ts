import { ApiProperty } from '@nestjs/swagger';

export class TestimonialResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  author: string;

  @ApiProperty({ example: { id: "Luar biasa!", en: "Outstanding!" } })
  quote: any;
  
  @ApiProperty()
  rating: number;

  @ApiProperty({ nullable: true })
  imageUrl: string | null;

  @ApiProperty()
  createdAt: Date;
}
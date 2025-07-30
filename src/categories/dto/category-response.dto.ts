import { ApiProperty } from '@nestjs/swagger';

// DTO untuk sub-kategori agar lebih terstruktur
class SubCategoryDto {
    @ApiProperty()
    id: number;

    @ApiProperty()
    name: Record<string, string>;
}

export class CategoryResponseDto {
  @ApiProperty({ example: 1 })
  id: number;

  @ApiProperty({ example: { "id": "Pakaian Pria", "en": "Men's Wear" } })
  name: Record<string, string>;

  @ApiProperty({ type: [SubCategoryDto] }) // Menandakan ini adalah array dari SubCategoryDto
  subCategories: SubCategoryDto[];
}
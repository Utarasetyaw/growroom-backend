import { ApiProperty } from '@nestjs/swagger';

class CategoryInSubDto {
  @ApiProperty()
  id: number;
  
  @ApiProperty()
  name: any;
}

export class SubcategoryResponseDto {
  @ApiProperty()
  id: number;
  
  @ApiProperty({ example: { "id": "Kemeja", "en": "Shirt" } })
  name: any;
  
  @ApiProperty()
  categoryId: number;
  
  @ApiProperty({ type: CategoryInSubDto })
  category: CategoryInSubDto;
}
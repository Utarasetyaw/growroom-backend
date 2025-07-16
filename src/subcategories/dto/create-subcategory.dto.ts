import { IsNotEmpty, IsObject, IsInt } from 'class-validator';

export class CreateSubcategoryDto {
  @IsNotEmpty()
  @IsObject()
  name: Record<string, string>; // contoh: { "id": "Daun Lebar", "en": "Broad Leaf" }

  @IsNotEmpty()
  @IsInt()
  categoryId: number;
}

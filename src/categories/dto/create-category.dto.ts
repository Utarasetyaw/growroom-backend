import { IsNotEmpty, IsObject } from 'class-validator';

export class CreateCategoryDto {
  @IsNotEmpty()
  @IsObject()
  name: Record<string, string>; // contoh: { "id": "Koleksi", "en": "Collection" }
}

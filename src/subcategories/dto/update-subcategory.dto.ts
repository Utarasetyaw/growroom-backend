import { IsOptional, IsObject, IsInt } from 'class-validator';

export class UpdateSubcategoryDto {
  @IsOptional()
  @IsObject()
  name?: Record<string, string>;

  @IsOptional()
  @IsInt()
  categoryId?: number;
}

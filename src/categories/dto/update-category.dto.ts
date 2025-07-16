import { IsOptional, IsObject } from 'class-validator';

export class UpdateCategoryDto {
  @IsOptional()
  @IsObject()
  name?: Record<string, string>;
}

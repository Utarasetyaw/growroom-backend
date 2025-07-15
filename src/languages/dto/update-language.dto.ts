import { IsOptional, IsBoolean } from 'class-validator';

export class UpdateLanguageDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

import { ApiProperty } from '@nestjs/swagger';

export class LanguageResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ example: 'Indonesia' })
  name: string;

  @ApiProperty({ example: 'id' })
  code: string;

  @ApiProperty({ description: 'Status aktif bahasa.' })
  isActive: boolean;

  @ApiProperty({ description: 'Apakah bahasa ini default.' })
  isDefault: boolean;
}
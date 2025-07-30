import { ApiProperty } from '@nestjs/swagger';

export class CurrencyResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ example: 'Indonesian Rupiah' })
  name: string;

  @ApiProperty({ example: 'IDR' })
  code: string;

  @ApiProperty({ example: 'Rp' })
  symbol: string;

  @ApiProperty({ description: 'Status aktif mata uang.' })
  isActive: boolean;

  @ApiProperty({ description: 'Apakah mata uang ini default.' })
  isDefault: boolean;
}
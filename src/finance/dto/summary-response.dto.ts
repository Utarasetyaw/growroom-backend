import { ApiProperty } from '@nestjs/swagger';

export class SummaryResponseDto {
  @ApiProperty({ description: 'Total omset dari pesanan yang berhasil.', example: 1500000 })
  omset: number;

  @ApiProperty({ description: 'Jumlah pesanan yang berhasil dibayar.', example: 10 })
  pesananBerhasil: number;

  @ApiProperty({ description: 'Jumlah pesanan yang gagal/dibatalkan.', example: 2 })
  pesananGagal: number;

  @ApiProperty({ description: 'Total semua pesanan dalam periode waktu.', example: 12 })
  pesananSemua: number;
}
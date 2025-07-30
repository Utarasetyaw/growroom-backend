import { ApiProperty } from '@nestjs/swagger';

export class PaymentMethodResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ example: 'Bank Transfer' })
  name: string;

  @ApiProperty({ example: 'bank_transfer', description: 'Kode unik untuk metode pembayaran.' })
  code: string;

  @ApiProperty({ description: 'Status aktif metode pembayaran.' })
  isActive: boolean;

  @ApiProperty({
    description: 'Konfigurasi terkait (e.g., API keys).',
    example: { serverKey: "...", clientKey: "..." },
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  config: any;
}
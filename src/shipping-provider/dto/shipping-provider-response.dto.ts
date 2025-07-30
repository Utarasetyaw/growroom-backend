import { ApiProperty } from '@nestjs/swagger';

export class ShippingProviderResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  code: string;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty({ type: 'object', additionalProperties: true, nullable: true })
  credentials: any;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
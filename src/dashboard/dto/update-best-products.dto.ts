import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';

export class UpdateBestProductsDto {
  @ApiProperty({
    description: 'Array berisi ID produk yang akan dijadikan produk unggulan.',
    example: [1, 5, 12],
    type: [Number],
  })
  @IsArray()
  @IsInt({ each: true })
  productIds: number[];
}
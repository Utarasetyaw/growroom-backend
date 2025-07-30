import { ApiProperty } from '@nestjs/swagger';

class ImageDto { @ApiProperty() id: number; @ApiProperty() url: string; }
class CurrencyDto { @ApiProperty() id: number; @ApiProperty() code: string; @ApiProperty() symbol: string; }
class PriceDto { @ApiProperty() id: number; @ApiProperty() price: number; @ApiProperty({ type: CurrencyDto }) currency: CurrencyDto; }
class SubCategoryDto { @ApiProperty() id: number; @ApiProperty() name: any; }

export class ProductResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() name: any;
  @ApiProperty() variant: any;
  @ApiProperty() stock: number;
  @ApiProperty({ nullable: true }) weight: number | null;
  @ApiProperty({ nullable: true }) careDetails: any | null;
  @ApiProperty() isBestProduct: boolean;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty({ type: [ImageDto] }) images: ImageDto[];
  @ApiProperty({ type: [PriceDto] }) prices: PriceDto[];
  @ApiProperty({ type: SubCategoryDto }) subCategory: SubCategoryDto;
}
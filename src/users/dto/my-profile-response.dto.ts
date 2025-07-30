import { ApiProperty } from '@nestjs/swagger';

// DTO Parsial untuk Order
class ProductInProfileOrderDto { @ApiProperty() name: any; }
class OrderItemInProfileDto { @ApiProperty() qty: number; @ApiProperty({ type: ProductInProfileOrderDto }) product: ProductInProfileOrderDto; }
class OrderInProfileDto { @ApiProperty() id: number; @ApiProperty() total: number; @ApiProperty() orderStatus: string; @ApiProperty() createdAt: Date; @ApiProperty({ type: [OrderItemInProfileDto] }) orderItems: OrderItemInProfileDto[]; }

export class MyProfileResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() email: string;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true }) phone: string | null;
  @ApiProperty({ nullable: true }) address: string | null;
  @ApiProperty({ nullable: true }) city: string | null;
  @ApiProperty({ nullable: true }) province: string | null;
  @ApiProperty({ nullable: true }) country: string | null;
  @ApiProperty({ nullable: true }) postalCode: string | null;
  @ApiProperty({ type: 'object', additionalProperties: true, nullable: true }) socialMedia: any;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty({ type: [OrderInProfileDto] }) orders: OrderInProfileDto[];
}
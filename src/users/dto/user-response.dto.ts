import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class UserResponseDto {
  @ApiProperty() id: number;
  @ApiProperty() email: string;
  @ApiProperty() name: string;
  @ApiProperty({ enum: Role }) role: Role;
  @ApiProperty({ type: [String] }) permissions: string[];
  @ApiProperty({ nullable: true }) phone: string | null;
  @ApiProperty({ nullable: true }) address: string | null;
  @ApiProperty({ nullable: true }) city: string | null;
  @ApiProperty({ nullable: true }) province: string | null;
  @ApiProperty({ nullable: true }) country: string | null;
  @ApiProperty({ nullable: true }) postalCode: string | null;
  @ApiProperty({ type: 'object', additionalProperties: true, nullable: true }) socialMedia: any;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}
import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString } from 'class-validator';

export class UpdatePermissionsDto {
  @ApiProperty({ type: [String], description: 'List permission baru untuk admin.', example: ['product', 'cs', 'finance'] })
  @IsArray()
  @IsString({ each: true })
  permissions: string[];
}
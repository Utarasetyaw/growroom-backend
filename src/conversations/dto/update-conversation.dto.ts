import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsInt, IsString } from 'class-validator';

export class UpdateConversationDto {
  @ApiProperty({
    description: 'ID dari admin/owner yang ditugaskan (opsional).',
    example: 3,
    required: false,
  })
  @IsOptional()
  @IsInt()
  assignedToId?: number;

  @ApiProperty({
    description: 'Status baru untuk percakapan (misal: "closed").',
    example: 'closed',
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;
}
import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateConversationDto {
  @ApiProperty({ description: 'ID dari pengguna yang memulai percakapan.', example: 12 })
  @IsInt()
  userId: number;

  @ApiProperty({
    description: 'ID dari admin/owner yang ditugaskan (opsional).',
    example: 2,
    required: false,
  })
  @IsOptional()
  @IsInt()
  assignedToId?: number;

  @ApiProperty({
    description: 'Status percakapan (misal: "open", "closed").',
    example: 'open',
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;
}
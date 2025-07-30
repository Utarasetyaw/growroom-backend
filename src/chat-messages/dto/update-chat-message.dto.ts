import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateChatMessageDto {
  @ApiProperty({
    description: 'Konten baru untuk pesan (opsional).',
    example: 'Pesan ini telah diedit.',
    required: false,
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({
    description: 'Menandai apakah pesan sudah dibaca (opsional).',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isRead?: boolean;
}
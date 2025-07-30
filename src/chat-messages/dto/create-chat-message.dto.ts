import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsInt, IsString } from 'class-validator';

export class CreateChatMessageDto {
  @ApiProperty({ description: 'ID dari percakapan terkait.', example: 1 })
  @IsNotEmpty()
  @IsInt()
  conversationId: number;

  @ApiProperty({ description: 'ID dari pengguna yang mengirim pesan.', example: 12 })
  @IsNotEmpty()
  @IsInt()
  senderId: number;

  @ApiProperty({ description: 'Isi dari pesan teks.', example: 'Halo, apakah ini tersedia?' })
  @IsNotEmpty()
  @IsString()
  content: string;
}
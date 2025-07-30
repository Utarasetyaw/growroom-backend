import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

class SenderDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;
  
  @ApiProperty()
  email: string;

  @ApiProperty({ enum: Role })
  role: Role;
}

export class ChatMessageResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  conversationId: number;

  @ApiProperty()
  senderId: number;

  @ApiProperty()
  content: string;
  
  @ApiProperty()
  isRead: boolean;

  @ApiProperty()
  createdAt: Date;
  
  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: SenderDto })
  sender: SenderDto;
}
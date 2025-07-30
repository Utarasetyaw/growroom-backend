import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

class UserInConversationDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: Role })
  role: Role;
}

class MessageInConversationDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  senderId: number;

  @ApiProperty()
  content: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  isRead: boolean;
}

export class ConversationResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  userId: number;

  @ApiProperty({ nullable: true })
  assignedToId: number | null;

  @ApiProperty()
  status: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty({ type: UserInConversationDto })
  user: UserInConversationDto;

  @ApiProperty({ type: UserInConversationDto, nullable: true })
  assignedTo: UserInConversationDto | null;

  @ApiProperty({ type: [MessageInConversationDto] })
  messages: MessageInConversationDto[];
}
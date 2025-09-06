import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

// DTO untuk informasi user di dalam percakapan
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

// PERBAIKAN: DTO baru untuk informasi sender di dalam pesan
class SenderInMessageDto {
  @ApiProperty()
  id: number;

  @ApiProperty({ nullable: true })
  name: string | null;

  @ApiProperty()
  email: string;

  @ApiProperty({ enum: Role })
  role: Role;
}

// PERBAIKAN: DTO untuk pesan telah diperbarui
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

  // PERBAIKAN: Menambahkan objek sender yang lengkap
  @ApiProperty({ type: SenderInMessageDto })
  sender: SenderInMessageDto;
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

  // Sekarang akan menggunakan DTO pesan yang sudah diperbaiki
  @ApiProperty({ type: [MessageInConversationDto] })
  messages: MessageInConversationDto[];
}

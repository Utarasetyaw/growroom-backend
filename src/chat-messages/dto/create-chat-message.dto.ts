import { IsNotEmpty, IsInt, IsString } from 'class-validator';

export class CreateChatMessageDto {
  @IsNotEmpty()
  @IsInt()
  conversationId: number;

  @IsNotEmpty()
  @IsInt()
  senderId: number;

  @IsNotEmpty()
  @IsString()
  content: string;
}

import { IsOptional, IsString, IsBoolean } from 'class-validator';

export class UpdateChatMessageDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsBoolean()
  isRead?: boolean;
}

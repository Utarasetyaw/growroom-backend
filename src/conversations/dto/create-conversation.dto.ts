import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateConversationDto {
  @IsInt()
  userId: number;

  @IsOptional()
  @IsInt()
  assignedToId?: number;

  @IsOptional()
  @IsString()
  status?: string;
}

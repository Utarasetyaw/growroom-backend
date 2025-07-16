import { IsOptional, IsInt, IsString } from 'class-validator';

export class UpdateConversationDto {
  @IsOptional()
  @IsInt()
  assignedToId?: number;

  @IsOptional()
  @IsString()
  status?: string;
}

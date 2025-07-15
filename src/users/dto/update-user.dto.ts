// src/users/dto/update-user.dto.ts
import { IsOptional, IsString, IsArray, IsEnum } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsEnum(Role)
  role?: Role;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissions?: string[];
}

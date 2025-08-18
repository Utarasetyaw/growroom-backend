import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '@prisma/client';
import { LoginDto } from './login.dto';

export class LoginPanelDto extends LoginDto {
  @ApiProperty({
    description: 'Peran yang digunakan untuk login, hanya ADMIN atau OWNER.',
    enum: [Role.ADMIN, Role.OWNER],
    example: 'ADMIN',
  })
  @IsEnum([Role.ADMIN, Role.OWNER])
  @IsNotEmpty()
  role: Role;
}
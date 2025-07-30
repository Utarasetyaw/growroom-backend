import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Email pengguna yang terdaftar',
    example: 'john.doe@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password pengguna (minimal 8 karakter)',
    example: 'password123',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
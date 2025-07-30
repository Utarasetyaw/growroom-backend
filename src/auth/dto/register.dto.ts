import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class RegisterDto {
  @ApiProperty({
    description: 'Email untuk akun baru',
    example: 'jane.doe@example.com',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Nama lengkap pengguna',
    example: 'Jane Doe',
  })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({
    description: 'Password untuk akun baru',
    example: 'strongPassword!@#',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}
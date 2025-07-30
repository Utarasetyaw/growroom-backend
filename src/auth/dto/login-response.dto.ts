import { ApiProperty } from '@nestjs/swagger';

export class LoginResponseDto {
  @ApiProperty({
    description: 'Pesan status login',
    example: 'Login successful',
  })
  message: string;

  @ApiProperty({
    description: 'JWT Bearer Token untuk otentikasi',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  access_token: string;
}
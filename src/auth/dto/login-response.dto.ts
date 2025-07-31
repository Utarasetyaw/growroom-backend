import { ApiProperty } from '@nestjs/swagger';
import { UserResponseDto } from '../../users/dto/user-response.dto'; // <-- Impor ini

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
  
  // ✅ TAMBAHKAN INI
  @ApiProperty({
    description: 'Data pengguna yang login.',
    type: UserResponseDto
  })
  user: UserResponseDto;
}
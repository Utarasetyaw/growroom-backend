import { ApiProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';

class UserInRegisterResponse {
    @ApiProperty()
    id: string;

    @ApiProperty()
    email: string;

    @ApiProperty()
    name: string;

    @ApiProperty({ enum: Role })
    role: Role;

    @ApiProperty({ type: [String] })
    permissions: string[];
}


export class RegisterResponseDto {
  @ApiProperty({
    description: 'Pesan status registrasi',
    example: 'Registration successful',
  })
  message: string;

  @ApiProperty({ type: UserInRegisterResponse })
  user: UserInRegisterResponse
}
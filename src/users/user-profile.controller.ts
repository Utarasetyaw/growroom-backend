import { Controller, Get, Patch, UseGuards, Req, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { MyProfileResponseDto } from './dto/my-profile-response.dto';
import { UserResponseDto } from './dto/user-response.dto';

@ApiTags('User Profile (Me)')
@ApiBearerAuth()
@Controller('profile')
@UseGuards(JwtAuthGuard)
export class UserProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Mendapatkan data profil user yang sedang login' })
  @ApiResponse({ status: 200, type: MyProfileResponseDto })
  getMe(@Req() req: RequestWithUser) {
    return this.usersService.findMe(req.user.userId);
  }

  @Patch()
  @ApiOperation({ summary: 'Memperbarui data profil user yang sedang login' })
  @ApiBody({ type: UpdateMyProfileDto })
  @ApiResponse({ status: 200, type: UserResponseDto })
  patchMe(@Req() req: RequestWithUser, @Body() dto: UpdateMyProfileDto) {
    return this.usersService.updateMe(req.user.userId, dto);
  }
}
// src/users/user-profile.controller.ts
import { Controller, Get, Patch, UseGuards, Req, Body } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';

@Controller('profile')
@UseGuards(JwtAuthGuard)
export class UserProfileController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  getMe(@Req() req: RequestWithUser) {
    return this.usersService.findMe(req.user.userId);
  }

  @Patch()
  patchMe(@Req() req: RequestWithUser, @Body() dto: any) {
    return this.usersService.updateMe(req.user.userId, dto);
  }
}

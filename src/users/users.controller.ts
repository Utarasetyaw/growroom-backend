import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  ForbiddenException,
  Req
} from '@nestjs/common';
import { Request } from 'express';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // =================== USER PROFILE (ME) ===================

 @Get('me')
async getMe(@Req() req: RequestWithUser) {
  const userId = req.user.userId;
  return this.usersService.findMe(userId);
}

@Patch('me')
async patchMe(@Req() req: RequestWithUser, @Body() body: any) {
  const userId = req.user.userId;
  return this.usersService.updateMe(userId, body);
}

  // =================== USER/ADMIN MANAGEMENT ===================

  // OWNER & ADMIN: Lihat semua user (dan admin)
  @Get()
  @Roles(Role.OWNER, Role.ADMIN)
  findAll() {
    return this.usersService.findAll();
  }

  // OWNER & ADMIN: Detail user
  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  // OWNER: Tambah user/admin (role dalam body)
  @Post()
  @Roles(Role.OWNER)
  createUser(@Body() body: any) {
    return this.usersService.createUser(body);
  }

  // OWNER/ADMIN: Update user/admin
  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @Body('role') role: Role // Cegah admin update ke OWNER
  ) {
    if (role && role === Role.OWNER) throw new ForbiddenException('Cannot change role to OWNER');
    return this.usersService.updateUser(id, dto);
  }

  // OWNER: Edit permissions admin
  @Patch(':id/permissions')
  @Roles(Role.OWNER)
  updatePermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body('permissions') permissions: string[]
  ) {
    return this.usersService.updatePermissions(id, permissions);
  }

  // OWNER/ADMIN: Hapus user/admin (kecuali OWNER)
  @Delete(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  async deleteUser(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findOne(id);
    if (user.role === Role.OWNER) throw new ForbiddenException('Cannot delete owner');
    return this.usersService.deleteUser(id);
  }
}

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
    console.log('[GET /users/me] UserID:', userId);
    const result = await this.usersService.findMe(userId);
    console.log('[GET /users/me] Result:', result);
    return result;
  }

  @Patch('me')
  async patchMe(@Req() req: RequestWithUser, @Body() body: any) {
    const userId = req.user.userId;
    console.log('[PATCH /users/me] UserID:', userId, 'Body:', body);
    const result = await this.usersService.updateMe(userId, body);
    console.log('[PATCH /users/me] Updated:', result);
    return result;
  }

  // =================== USER/ADMIN MANAGEMENT ===================

  @Get()
  @Roles(Role.OWNER, Role.ADMIN)
  async findAll(@Req() req: RequestWithUser) {
    console.log('[GET /users] Role:', req.user.role);
    if (req.user.role === Role.ADMIN) {
      console.log('[GET /users] ADMIN - list USER only');
      const users = await this.usersService.findAll(Role.USER);
      console.log('[GET /users] Result:', users);
      return users;
    }
    // Owner boleh lihat semua
    const users = await this.usersService.findAll();
    console.log('[GET /users] OWNER - all users/admins:', users);
    return users;
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  async findOne(@Req() req: RequestWithUser, @Param('id', ParseIntPipe) id: number) {
    console.log('[GET /users/:id] Role:', req.user.role, 'TargetID:', id);
    const user = await this.usersService.findOne(id);
    if (req.user.role === Role.ADMIN && user.role !== Role.USER) {
      console.warn('[GET /users/:id] ADMIN forbidden for this role');
      throw new ForbiddenException('Admin cannot access this user');
    }
    console.log('[GET /users/:id] Result:', user);
    return user;
  }

  @Post()
  @Roles(Role.OWNER, Role.ADMIN)
  async createUser(@Req() req: RequestWithUser, @Body() body: any) {
    console.log('[POST /users] By:', req.user, 'Body:', body);
    if (req.user.role === Role.ADMIN) {
      if (body.role && body.role !== Role.USER) {
        console.warn('[POST /users] ADMIN tried to create non-USER');
        throw new ForbiddenException('Admin only allowed to create USER');
      }
      body.role = Role.USER;
    }
    const result = await this.usersService.createUser(body);
    console.log('[POST /users] Created:', result);
    return result;
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  async updateUser(
    @Req() req: RequestWithUser,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
    @Body('role') role: Role
  ) {
    console.log('[PATCH /users/:id] By:', req.user, 'Target:', id, 'DTO:', dto);
    const userTarget = await this.usersService.findOne(id);
    if (req.user.role === Role.ADMIN && userTarget.role !== Role.USER) {
      console.warn('[PATCH /users/:id] ADMIN forbidden update for this role');
      throw new ForbiddenException('Admin only allowed to update USER');
    }
    if (role && role === Role.OWNER) {
      console.warn('[PATCH /users/:id] Forbidden change to OWNER');
      throw new ForbiddenException('Cannot change role to OWNER');
    }
    const result = await this.usersService.updateUser(id, dto);
    console.log('[PATCH /users/:id] Updated:', result);
    return result;
  }

  @Patch(':id/permissions')
  @Roles(Role.OWNER)
  async updatePermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body('permissions') permissions: string[]
  ) {
    console.log('[PATCH /users/:id/permissions] Target:', id, 'Permissions:', permissions);
    const result = await this.usersService.updatePermissions(id, permissions);
    console.log('[PATCH /users/:id/permissions] Updated:', result);
    return result;
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  async deleteUser(@Req() req: RequestWithUser, @Param('id', ParseIntPipe) id: number) {
    console.log('[DELETE /users/:id] By:', req.user, 'Target:', id);
    const user = await this.usersService.findOne(id);
    if (user.role === Role.OWNER) {
      console.warn('[DELETE /users/:id] Cannot delete OWNER');
      throw new ForbiddenException('Cannot delete owner');
    }
    if (req.user.role === Role.ADMIN && user.role !== Role.USER) {
      console.warn('[DELETE /users/:id] ADMIN forbidden to delete non-USER');
      throw new ForbiddenException('Admin only allowed to delete USER');
    }
    const result = await this.usersService.deleteUser(id);
    console.log('[DELETE /users/:id] Deleted:', result);
    return result;
  }
}

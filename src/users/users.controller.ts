import {
  Controller, Get, Post, Patch, Delete, Param, Body, UseGuards, ParseIntPipe, ForbiddenException, Req
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiForbiddenResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';
import { RequestWithUser } from '../common/interfaces/request-with-user.interface';
// Impor DTO yang sudah kita buat sebelumnya
import { MyProfileResponseDto } from './dto/my-profile-response.dto';
import { UpdateMyProfileDto } from './dto/update-my-profile.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';

@ApiTags('Users (General & Profile)')
@ApiBearerAuth()
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // =================== USER PROFILE (ME) ===================

  @Get('me')
  @ApiOperation({ summary: 'Mendapatkan data profil user yang sedang login' })
  @ApiResponse({ status: 200, description: 'Data profil lengkap, termasuk riwayat order.', type: MyProfileResponseDto })
  async getMe(@Req() req: RequestWithUser) {
    const userId = req.user.userId;
    console.log('[GET /users/me] UserID:', userId);
    const result = await this.usersService.findMe(userId);
    console.log('[GET /users/me] Result:', result);
    return result;
  }

  @Patch('me')
  @ApiOperation({ summary: 'Memperbarui data profil user yang sedang login' })
  @ApiBody({ type: UpdateMyProfileDto }) // <-- Sudah benar menggunakan DTO baru
  @ApiResponse({ status: 200, description: 'Data profil yang telah diperbarui.', type: UserResponseDto })
  async patchMe(@Req() req: RequestWithUser, @Body() body: UpdateMyProfileDto) { // <-- Sudah benar menggunakan DTO baru
    const userId = req.user.userId;
    console.log('[PATCH /users/me] UserID:', userId, 'Body:', body);
    const result = await this.usersService.updateMe(userId, body);
    console.log('[PATCH /users/me] Updated:', result);
    return result;
  }

  // =================== USER/ADMIN MANAGEMENT ===================

  @Get()
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'List semua user (Owner: semua, Admin: USER saja)' })
  @ApiResponse({ status: 200, type: [UserResponseDto] })
  async findAll(@Req() req: RequestWithUser) {
    console.log('[GET /users] Role:', req.user.role);
    if (req.user.role === Role.ADMIN) {
      console.log('[GET /users] ADMIN - list USER only');
      return this.usersService.findAll(Role.USER);
    }
    const users = await this.usersService.findAll();
    console.log('[GET /users] OWNER - all users/admins:', users);
    return users;
  }

  @Get(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Lihat detail satu user' })
  @ApiParam({ name: 'id', description: 'ID User' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiNotFoundResponse() @ApiForbiddenResponse()
  async findOne(@Req() req: RequestWithUser, @Param('id', ParseIntPipe) id: number) {
    console.log('[GET /users/:id] Role:', req.user.role, 'TargetID:', id);
    const user = await this.usersService.findOne(id);
    if (req.user.role === Role.ADMIN && user.role !== Role.USER) {
      console.warn('[GET /users/:id] ADMIN forbidden for this role');
      throw new ForbiddenException('Admin cannot access this user');
    }
    return user;
  }

  @Post()
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Buat user baru (Owner: bisa semua, Admin: USER saja)' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, type: UserResponseDto })
  @ApiForbiddenResponse()
  async createUser(@Req() req: RequestWithUser, @Body() body: CreateUserDto & { role?: Role }) {
    console.log('[POST /users] By:', req.user, 'Body:', body);
    if (req.user.role === Role.ADMIN) {
      if (body.role && body.role !== Role.USER) {
        console.warn('[POST /users] ADMIN tried to create non-USER');
        throw new ForbiddenException('Admin only allowed to create USER');
      }
      body.role = Role.USER;
    }
    return this.usersService.createUser(body);
  }

  @Patch(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Update satu user' })
  @ApiParam({ name: 'id', description: 'ID User' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiNotFoundResponse() @ApiForbiddenResponse()
  async updateUser(@Req() req: RequestWithUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    console.log('[PATCH /users/:id] By:', req.user, 'Target:', id, 'DTO:', dto);
    const userTarget = await this.usersService.findOne(id);
    if (req.user.role === Role.ADMIN && userTarget.role !== Role.USER) {
      console.warn('[PATCH /users/:id] ADMIN forbidden update for this role');
      throw new ForbiddenException('Admin only allowed to update USER');
    }
    if (dto.role && dto.role === Role.OWNER) {
      console.warn('[PATCH /users/:id] Forbidden change to OWNER');
      throw new ForbiddenException('Cannot change role to OWNER');
    }
    return this.usersService.updateUser(id, dto);
  }

  @Patch(':id/permissions')
  @Roles(Role.OWNER)
  @ApiOperation({ summary: 'Update permissions untuk admin (Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID Admin' })
  @ApiBody({ type: UpdatePermissionsDto })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiNotFoundResponse()
  async updatePermissions(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePermissionsDto) {
    console.log('[PATCH /users/:id/permissions] Target:', id, 'Permissions:', dto.permissions);
    return this.usersService.updatePermissions(id, dto.permissions);
  }

  @Delete(':id')
  @Roles(Role.OWNER, Role.ADMIN)
  @ApiOperation({ summary: 'Hapus satu user' })
  @ApiParam({ name: 'id', description: 'ID User' })
  @ApiResponse({ status: 200 })
  @ApiNotFoundResponse() @ApiForbiddenResponse()
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
    return this.usersService.deleteUser(id);
  }
}

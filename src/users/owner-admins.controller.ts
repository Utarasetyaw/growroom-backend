import { Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe, UseGuards, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiForbiddenResponse, ApiNotFoundResponse } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { UpdatePermissionsDto } from './dto/update-permissions.dto';

@ApiTags('Admins (Owner-Managed)')
@ApiBearerAuth()
@Controller('owner/admins')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER)
export class OwnerAdminsController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List semua user dengan role ADMIN (Owner Only)' })
  @ApiResponse({ status: 200, type: [UserResponseDto] })
  findAll() { return this.usersService.findAll(Role.ADMIN); }

  @Post()
  @ApiOperation({ summary: 'Buat user baru dengan role ADMIN (Owner Only)' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, type: UserResponseDto })
  create(@Body() dto: CreateUserDto) { return this.usersService.createUser({ ...dto, role: Role.ADMIN }); }

  @Get(':id')
  @ApiOperation({ summary: 'Lihat detail satu admin (Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID Admin' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiNotFoundResponse() @ApiForbiddenResponse()
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findOne(id);
    if (user.role !== Role.ADMIN) throw new ForbiddenException('Only admin can be accessed here');
    return user;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update satu admin (Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID Admin' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiNotFoundResponse() @ApiForbiddenResponse()
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    const user = await this.usersService.findOne(id);
    if (user.role !== Role.ADMIN) throw new ForbiddenException('Only admin can be updated here');
    return this.usersService.updateUser(id, dto);
  }

  @Patch(':id/permissions')
  @ApiOperation({ summary: 'Update permissions untuk admin (Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID Admin' })
  @ApiBody({ type: UpdatePermissionsDto })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiNotFoundResponse() @ApiForbiddenResponse()
  async updatePermissions(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdatePermissionsDto) {
    const user = await this.usersService.findOne(id);
    if (user.role !== Role.ADMIN) throw new ForbiddenException('Only admin can edit permissions');
    return this.usersService.updatePermissions(id, dto.permissions);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hapus satu admin (Owner Only)' })
  @ApiParam({ name: 'id', description: 'ID Admin' })
  @ApiResponse({ status: 200 })
  @ApiNotFoundResponse() @ApiForbiddenResponse()
  async remove(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findOne(id);
    if (user.role !== Role.ADMIN) throw new ForbiddenException('Only admin can be deleted here');
    return this.usersService.deleteUser(id);
  }
}
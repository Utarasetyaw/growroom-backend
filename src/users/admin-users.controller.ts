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

@ApiTags('Users (Admin-Managed)')
@ApiBearerAuth()
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'List semua user dengan role USER (Admin Only)' })
  @ApiResponse({ status: 200, type: [UserResponseDto] })
  findAll() { return this.usersService.findAll(Role.USER); }

  @Post()
  @ApiOperation({ summary: 'Buat user baru dengan role USER (Admin Only)' })
  @ApiBody({ type: CreateUserDto })
  @ApiResponse({ status: 201, type: UserResponseDto })
  create(@Body() dto: CreateUserDto) { return this.usersService.createUser({ ...dto, role: Role.USER }); }

  @Get(':id')
  @ApiOperation({ summary: 'Lihat detail satu user (Admin Only)' })
  @ApiParam({ name: 'id', description: 'ID User' })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiNotFoundResponse() @ApiForbiddenResponse()
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findOne(id);
    if (user.role !== Role.USER) throw new ForbiddenException('Admin only allowed to access USER');
    return user;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update satu user (Admin Only)' })
  @ApiParam({ name: 'id', description: 'ID User' })
  @ApiBody({ type: UpdateUserDto })
  @ApiResponse({ status: 200, type: UserResponseDto })
  @ApiNotFoundResponse() @ApiForbiddenResponse()
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    const user = await this.usersService.findOne(id);
    if (user.role !== Role.USER) throw new ForbiddenException('Admin only allowed to update USER');
    return this.usersService.updateUser(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Hapus satu user (Admin Only)' })
  @ApiParam({ name: 'id', description: 'ID User' })
  @ApiResponse({ status: 200 })
  @ApiNotFoundResponse() @ApiForbiddenResponse()
  async remove(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findOne(id);
    if (user.role !== Role.USER) throw new ForbiddenException('Admin only allowed to delete USER');
    return this.usersService.deleteUser(id);
  }
}
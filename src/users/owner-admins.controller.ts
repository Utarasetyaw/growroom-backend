// src/users/owner-admins.controller.ts
import {
  Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe, UseGuards, ForbiddenException
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('owner/admins')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER)
export class OwnerAdminsController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll(Role.ADMIN);
  }

  @Post()
  create(@Body() body: any) {
    return this.usersService.createUser({ ...body, role: Role.ADMIN });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findOne(id);
    if (user.role !== Role.ADMIN) throw new ForbiddenException('Only admin can be accessed here');
    return user;
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    const user = await this.usersService.findOne(id);
    if (user.role !== Role.ADMIN) throw new ForbiddenException('Only admin can be updated here');
    return this.usersService.updateUser(id, dto);
  }

  @Patch(':id/permissions')
  async updatePermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body('permissions') permissions: string[]
  ) {
    const user = await this.usersService.findOne(id);
    if (user.role !== Role.ADMIN) throw new ForbiddenException('Only admin can edit permissions');
    return this.usersService.updatePermissions(id, permissions);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findOne(id);
    if (user.role !== Role.ADMIN) throw new ForbiddenException('Only admin can be deleted here');
    return this.usersService.deleteUser(id);
  }
}

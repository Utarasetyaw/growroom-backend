// src/users/owner-users.controller.ts
import {
  Controller, Get, Post, Patch, Delete, Param, Body, ParseIntPipe, UseGuards, ForbiddenException
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('owner/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.OWNER)
export class OwnerUsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll() {
    return this.usersService.findAll(Role.USER);
  }

  @Post()
  create(@Body() body: any) {
    return this.usersService.createUser({ ...body, role: Role.USER });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findOne(id);
    if (user.role !== Role.USER) throw new ForbiddenException('Only user can be accessed here');
    return user;
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    const user = await this.usersService.findOne(id);
    if (user.role !== Role.USER) throw new ForbiddenException('Only user can be updated here');
    return this.usersService.updateUser(id, dto);
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findOne(id);
    if (user.role !== Role.USER) throw new ForbiddenException('Only user can be deleted here');
    return this.usersService.deleteUser(id);
  }
}

import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { OwnerUsersController } from './owner-users.controller';
import { OwnerAdminsController } from './owner-admins.controller';
import { AdminUsersController } from './admin-users.controller';
import { UserProfileController } from './user-profile.controller';

@Module({
  controllers: [
    OwnerUsersController,
    OwnerAdminsController,
    AdminUsersController,
    UserProfileController
  ],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}

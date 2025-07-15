import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export type AllowedRole = Role | 'product' | 'cs' | 'finance';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: AllowedRole[]) => SetMetadata(ROLES_KEY, roles);

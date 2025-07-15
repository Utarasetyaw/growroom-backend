// src/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, AllowedRole } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AllowedRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      // Jika tidak ada @Roles di endpoint, akses dibuka
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const user = req.user;

    // OWNER boleh semua (hard rule, boleh diubah jika ada OWNER-only logic di controller)
    if (user.role === 'OWNER') {
      return true;
    }

    // ADMIN: hanya boleh akses jika endpoint mengizinkan ADMIN
    if (user.role === 'ADMIN') {
      // Jika endpoint hanya OWNER, admin tidak boleh!
      if (!requiredRoles.includes('ADMIN')) {
        throw new ForbiddenException('You do not have access to this resource');
      }
      return true;
    }

    // USER: hanya boleh akses jika endpoint mengizinkan USER
    if (user.role === 'USER') {
      if (!requiredRoles.includes('USER')) {
        throw new ForbiddenException('You do not have access to this resource');
      }
      return true;
    }

    // Cek permission (hanya jika endpoint menulis custom permission string, misal: @Roles('product'))
    return requiredRoles.some((role) => user.permissions?.includes(role));
  }
}

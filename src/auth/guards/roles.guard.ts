// src/auth/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, AllowedRole } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Mengambil roles yang dibutuhkan dari decorator @Roles('...')
    const requiredRoles = this.reflector.getAllAndOverride<AllowedRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Jika endpoint tidak butuh role spesifik, izinkan akses
    if (!requiredRoles) {
      return true;
    }

    // Mengambil data user yang sudah divalidasi oleh JwtAuthGuard
    const { user } = context.switchToHttp().getRequest();
    
    // Jika user adalah OWNER, selalu berikan akses
    if (user.role === 'OWNER') {
        return true;
    }

    // Cek apakah user (ADMIN) memiliki setidaknya satu dari permission yang dibutuhkan
    return requiredRoles.some((role) => user.permissions?.includes(role));
  }
}
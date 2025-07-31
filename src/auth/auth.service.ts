// src/auth/auth.service.ts
import { Injectable, BadRequestException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { Role, User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  /**
   * Validates a user by checking their email and password.
   * @param email The user's email.
   * @param pass The user's plain-text password.
   * @returns The user object without the password hash if validation is successful, otherwise null.
   */
  async validateUser(email: string, pass: string): Promise<any> {
    const user = await this.usersService.findOneByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      // Omit password from the result
      const { password, ...result } = user;
      return result;
    }
    return null;
  }

  /**
   * Creates a JWT and returns it along with user data upon successful login.
   * @param user The user object, typically from validateUser.
   * @returns An object containing a success message, the access token, and the user profile.
   */
  async login(user: User) {
    const payload = {
      email: user.email,
      sub: user.id, // 'sub' is standard for subject (user ID)
      role: user.role,
      permissions: user.permissions,
    };
    
    // Omit password from the returned user profile
    const { password, ...userProfile } = user;

    return {
      message: 'Login successful',
      access_token: this.jwtService.sign(payload),
      user: userProfile,
    };
  }

  /**
   * Registers a new user with a specified role.
   * @param data The user data including email, name, and password.
   * @param allowedRole The role the new user should have.
   * @returns A success message and the newly created user object (without password).
   */
  async register(data: any, allowedRole: Role) {
    // 1. Check if email is already registered
    const existingUser = await this.usersService.findOneByEmail(data.email);
    if (existingUser) {
      throw new BadRequestException('Email is already registered.');
    }

    // 2. Ensure registration is for the allowed role
    if (data.role !== allowedRole) {
      throw new ForbiddenException(`Registration is only allowed for the ${allowedRole} role.`);
    }

    // 3. (Optional) Limit to a single OWNER
    if (allowedRole === Role.OWNER) {
      const ownerExists = await this.prisma.user.findFirst({ where: { role: Role.OWNER } });
      if (ownerExists) {
        throw new ForbiddenException('An owner account already exists.');
      }
    }

    // 4. Hash the password
    const hashedPassword = await bcrypt.hash(data.password, 10);

    // 5. Create the new user in the database
    const newUser = await this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: hashedPassword,
        role: data.role,
        permissions: data.permissions || [], // Ensure permissions is an array
      },
    });

    // 6. Return a clean response without the password
    const { password, ...result } = newUser;
    return {
      message: 'Registration successful',
      user: result,
    };
  }
}
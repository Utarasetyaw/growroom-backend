import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtSecret } from '../auth.module'; // pastikan path benar dan sesuai

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: any) {
    // Payload berisi sub, email, role, dst (lihat AuthService.login)
    return { userId: payload.sub, email: payload.email, role: payload.role, permissions: payload.permissions };
  }
}

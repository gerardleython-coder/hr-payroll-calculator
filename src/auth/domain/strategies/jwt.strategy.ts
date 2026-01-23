import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

export interface JwtPayload {
  sub: string;
  username: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        process.env.JWT_SECRET || 'default-secret-change-in-production',
    });
  }

  validate(payload: JwtPayload) {
    // This method is called after JWT is verified
    // Return user object that will be attached to request.user
    return {
      id: payload.sub,
      username: payload.username,
      role: payload.role,
    };
  }
}

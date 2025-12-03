import { Injectable, UnauthorizedException } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { UserService } from "../user.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly userService: UserService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || "your-secret-key",
      ignoreExpiration: false,
    });
  }

  async validate(payload: { userId: string; username: string; email: string }) {
    const user = await this.userService.getUserById(payload.userId);
    if (!user || !user.is_active) {
      throw new UnauthorizedException("用户不存在或已被禁用");
    }
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
    };
  }
}

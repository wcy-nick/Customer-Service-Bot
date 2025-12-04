import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { UserService } from "../user.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly userService: UserService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || "your-secret-key",
      ignoreExpiration: false,
    });
  }

  async validate(payload: { userId: string; username: string; email: string }) {
    this.logger.log(
      `JWT策略验证用户 ${payload.username} (ID: ${payload.userId})`,
    );
    const user = await this.userService.getUserById(payload.userId);
    if (!user) {
      this.logger.warn(`JWT策略验证失败：用户 ${payload.username} 不存在`);
      throw new UnauthorizedException("用户不存在或已被禁用");
    }
    if (!user.is_active) {
      this.logger.warn(`JWT策略验证失败：用户 ${payload.username} 已被禁用`);
      throw new UnauthorizedException("用户不存在或已被禁用");
    }
    this.logger.log(`JWT策略验证成功：用户 ${payload.username}`);
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
    };
  }
}

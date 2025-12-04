import { Injectable, UnauthorizedException, Logger } from "@nestjs/common";
import { PassportStrategy } from "@nestjs/passport";
import { Strategy } from "passport-local";
import { AuthService } from "./auth.service";
import { User } from "../types/types";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(LocalStrategy.name);

  constructor(private readonly authService: AuthService) {
    super({
      usernameField: "username",
      passwordField: "password",
    });
  }

  async validate(username: string, password: string): Promise<User> {
    this.logger.log(`本地策略验证用户 ${username}`);
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      this.logger.warn(`本地策略验证失败：用户 ${username} 无效`);
      throw new UnauthorizedException("用户名或密码错误");
    }
    this.logger.log(`本地策略验证成功：用户 ${username}`);
    return user;
  }
}

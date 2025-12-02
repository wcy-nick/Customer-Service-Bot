import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { UserService } from './user.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly userService: UserService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: { headers: { authorization?: string }; user?: any } = context
      .switchToHttp()
      .getRequest();

    // 获取Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('缺少授权令牌');
    }

    // 验证Bearer token格式
    const [bearer, token] = authHeader.split(' ');
    if (bearer !== 'Bearer' || !token) {
      throw new UnauthorizedException('授权令牌格式无效');
    }

    try {
      // 验证JWT token
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-secret-key',
      ) as { user_id: string };

      if (!decoded || !decoded.user_id) {
        throw new UnauthorizedException('无效的授权令牌');
      }

      // 查询用户是否存在
      const user = await this.userService.getUserById(decoded.user_id);

      if (!user || !user.is_active) {
        throw new UnauthorizedException('用户不存在或已被禁用');
      }

      // 将用户信息注入到request对象中
      request.user = {
        id: user.id,
        username: user.username,
        role: user.role,
        email: user.email,
      };

      return true;
    } catch (error: any) {
      const errorName = (error as Error).name;
      if (errorName === 'TokenExpiredError') {
        throw new UnauthorizedException('授权令牌已过期');
      } else if (errorName === 'JsonWebTokenError') {
        throw new UnauthorizedException('无效的授权令牌');
      } else if (error instanceof UnauthorizedException) {
        throw error;
      } else {
        throw new InternalServerErrorException('认证过程中发生错误');
      }
    }
  }
}

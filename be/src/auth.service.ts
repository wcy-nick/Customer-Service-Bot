import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";

interface RegisterUserInput {
  username: string;
  email: string;
  password: string;
  display_name?: string;
}

interface LoginUserInput {
  username: string;
  password: string;
}

export interface UserDto {
  id: string;
  username: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
  role: string;
}

interface TokenPayload {
  userId: string;
  username: string;
  email: string;
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  private async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  private async comparePasswords(
    plainPassword: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  private generateAccessToken(payload: TokenPayload): string {
    return jwt.sign(payload, process.env.JWT_SECRET || "your-secret-key", {
      expiresIn: "15m",
    });
  }

  private generateRefreshToken(payload: TokenPayload): string {
    return jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key",
      {
        expiresIn: "7d",
      },
    );
  }

  private async createUserSession(
    userId: string,
    tokenHash: string,
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7天过期

    await this.prisma.client.userSession.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });
  }

  private async hashToken(token: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(token, salt);
  }

  async register(input: RegisterUserInput): Promise<UserDto> {
    // 检查用户名是否已存在
    const existingUser = await this.prisma.client.user.findFirst({
      where: {
        OR: [{ username: input.username }, { email: input.email }],
      },
    });

    if (existingUser) {
      if (existingUser.username === input.username) {
        throw new ConflictException("用户名已存在");
      }
      throw new ConflictException("邮箱已被注册");
    }

    // 加密密码
    const passwordHash = await this.hashPassword(input.password);

    // 创建用户
    const user = await this.prisma.client.user.create({
      data: {
        username: input.username,
        email: input.email,
        passwordHash,
        displayName: input.display_name,
        role: "user",
      },
    });

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      display_name: user.displayName ?? undefined,
      avatar_url: user.avatarUrl ?? undefined,
      role: user.role,
    };
  }

  async login(input: LoginUserInput): Promise<{
    access_token: string;
    refresh_token: string;
    user: UserDto;
  }> {
    // 查找用户
    const user = await this.prisma.client.user.findUnique({
      where: { username: input.username },
    });

    if (
      !user ||
      !(await this.comparePasswords(input.password, user.passwordHash))
    ) {
      throw new UnauthorizedException("用户名或密码错误");
    }

    // 检查用户是否激活
    if (!user.isActive) {
      throw new UnauthorizedException("用户账号已被禁用");
    }

    // 更新最后登录时间
    await this.prisma.client.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 生成token
    const payload: TokenPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
    };

    const accessToken = this.generateAccessToken(payload);
    const refreshToken = this.generateRefreshToken(payload);
    const refreshTokenHash = await this.hashToken(refreshToken);

    // 保存refresh token到数据库
    await this.createUserSession(user.id, refreshTokenHash);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        display_name: user.displayName ?? undefined,
        avatar_url: user.avatarUrl ?? undefined,
        role: user.role,
      },
    };
  }

  async refreshToken(refreshToken: string): Promise<{ access_token: string }> {
    try {
      // 验证refresh token
      const payload = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key",
      ) as TokenPayload;

      // 查找用户session
      const userSessions = await this.prisma.client.userSession.findMany({
        where: { userId: payload.userId },
      });

      // 验证token是否在数据库中
      let isValidToken = false;
      for (const session of userSessions) {
        if (await bcrypt.compare(refreshToken, session.tokenHash)) {
          isValidToken = true;
          break;
        }
      }

      if (!isValidToken) {
        throw new UnauthorizedException("无效的refresh token");
      }

      // 生成新的access token
      const newAccessToken = this.generateAccessToken({
        userId: payload.userId,
        username: payload.username,
        email: payload.email,
      });

      return { access_token: newAccessToken };
    } catch {
      throw new UnauthorizedException("无效的refresh token");
    }
  }

  async logout(token: string): Promise<void> {
    try {
      // 验证token并获取用户信息
      const payload = jwt.verify(
        token,
        process.env.JWT_SECRET || "your-secret-key",
      ) as TokenPayload;

      // 可以选择在这里删除所有用户的session
      // 或者实现更精细的token管理
      await this.prisma.client.userSession.deleteMany({
        where: { userId: payload.userId },
      });
    } catch {
      // 即使token无效，也返回成功，以防止信息泄露
      return;
    }
  }

  async validateUserById(userId: string): Promise<UserDto | null> {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.isActive) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      email: user.email,
      display_name: user.displayName ?? undefined,
      avatar_url: user.avatarUrl ?? undefined,
      role: user.role,
    };
  }
}

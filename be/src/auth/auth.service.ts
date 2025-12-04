import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import * as bcrypt from "bcrypt";
import { JwtService } from "@nestjs/jwt";
import {
  RegisterUserInput,
  LoginUserInput,
  UserDto,
  TokenPayload,
  User,
} from "../types/types";

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  private get prisma() {
    return this.prismaService.client;
  }

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

  async validateUser(username: string, password: string): Promise<User | null> {
    this.logger.log(`正在验证用户 ${username}`);
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      this.logger.warn(`用户 ${username} 不存在`);
      return null;
    }

    if (await this.comparePasswords(password, user.passwordHash)) {
      this.logger.log(`用户 ${username} 验证成功`);
      return user;
    }

    this.logger.warn(`用户 ${username} 密码错误`);
    return null;
  }

  private generateAccessToken(payload: TokenPayload): string {
    return this.jwtService.sign(payload, {
      expiresIn: "15m",
    });
  }

  private generateRefreshToken(payload: TokenPayload): string {
    return this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key",
      expiresIn: "7d",
    });
  }

  private async createUserSession(
    userId: string,
    tokenHash: string,
  ): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7天过期

    await this.prisma.userSession.create({
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
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ username: input.username }, { email: input.email }],
      },
    });

    if (existingUser) {
      if (existingUser.username === input.username) {
        this.logger.warn(`用户注册失败：用户名 ${input.username} 已存在`);
        throw new ConflictException("用户名已存在");
      }
      this.logger.warn(`用户注册失败：邮箱 ${input.email} 已被注册`);
      throw new ConflictException("邮箱已被注册");
    }

    // 加密密码
    const hashedPassword = await this.hashPassword(input.password);

    // 创建用户
    const user = await this.prisma.user.create({
      data: {
        username: input.username,
        email: input.email,
        passwordHash: hashedPassword,
        displayName: input.display_name,
        role: "user",
      },
    });

    this.logger.log(`用户 ${input.username} 注册成功`);
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
    // 使用validateUser方法验证用户
    const user = await this.validateUser(input.username, input.password);
    if (!user) {
      this.logger.warn(`用户 ${input.username} 登录失败：用户名或密码错误`);
      throw new UnauthorizedException("用户名或密码错误");
    }

    // 检查用户是否激活
    if (!user.isActive) {
      this.logger.warn(`用户 ${input.username} 登录失败：账号已被禁用`);
      throw new UnauthorizedException("用户账号已被禁用");
    }

    return this.loginWithUser(user);
  }

  async loginWithUser(user: User): Promise<{
    access_token: string;
    refresh_token: string;
    user: UserDto;
  }> {
    // 更新最后登录时间
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 生成token
    const payload: TokenPayload = {
      userId: user.id,
      username: user.username,
      email: user.email,
    };

    this.logger.log(`为用户 ${user.username} 生成访问令牌和刷新令牌`);
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
      const payload = this.jwtService.verify<TokenPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key",
      });

      // 查找用户session
      const userSessions = await this.prisma.userSession.findMany({
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
        this.logger.warn(`无效的refresh token for user ${payload.username}`);
        throw new UnauthorizedException("无效的refresh token");
      }

      // 生成新的access token
      const newAccessToken = this.generateAccessToken({
        userId: payload.userId,
        username: payload.username,
        email: payload.email,
      });

      this.logger.log(`为用户 ${payload.username} 生成新的访问令牌`);
      return { access_token: newAccessToken };
    } catch (error) {
      this.logger.warn(`刷新令牌失败: ${(error as Error).message}`);
      throw new UnauthorizedException("无效的refresh token");
    }
  }

  async logout(token: string): Promise<void> {
    try {
      // 验证token并获取用户信息
      const payload = this.jwtService.verify<TokenPayload>(token);

      // 可以选择在这里删除所有用户的session
      // 或者实现更精细的token管理
      await this.prisma.userSession.deleteMany({
        where: { userId: payload.userId },
      });
      this.logger.log(`用户 ${payload.username} 已登出，删除所有会话`);
    } catch {
      // 即使token无效，也返回成功，以防止信息泄露
      this.logger.warn("登出时验证token失败，但仍返回成功");
    }
  }
}

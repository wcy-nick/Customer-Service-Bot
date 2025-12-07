import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  Request,
  UseGuards,
  Logger,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBody,
  ApiResponse,
  ApiOperation,
  ApiHeader,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import { LocalAuthGuard } from "./local-auth.guard";
import type {
  RefreshTokenRequest,
  LoginResponse,
  RefreshTokenResponse,
  RegisterUserInput,
} from "../types/types";
import { User, UserRole } from "../types/types";

@ApiTags("auth")
@Controller("api/auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: "用户登录" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        username: { type: "string", description: "用户名" },
        password: { type: "string", description: "密码" },
      },
      required: ["username", "password"],
    },
    description: "登录凭证",
  })
  @ApiResponse({
    status: 200,
    description: "登录成功",
    schema: {
      type: "object",
      properties: {
        access_token: { type: "string", description: "访问令牌" },
        refresh_token: { type: "string", description: "刷新令牌" },
        user: {
          type: "object",
          properties: {
            id: { type: "string", description: "用户ID" },
            username: { type: "string", description: "用户名" },
            email: { type: "string", description: "邮箱" },
            display_name: { type: "string", description: "显示名称" },
            avatar_url: { type: "string", description: "头像URL" },
            role: {
              type: "string",
              description: "用户角色",
              enum: [UserRole.user, UserRole.admin],
            },
            created_at: {
              type: "string",
              format: "date-time",
              description: "创建时间",
            },
            is_active: { type: "boolean", description: "是否激活" },
            last_login_at: {
              type: "string",
              format: "date-time",
              description: "最后登录时间",
            },
          },
        },
      },
      required: ["access_token", "refresh_token", "user"],
    },
  })
  @ApiResponse({ status: 401, description: "无效的凭证" })
  @UseGuards(LocalAuthGuard)
  @Post("login")
  async login(@Request() req: { user: User }): Promise<LoginResponse> {
    this.logger.log(`用户 ${req.user.username} 正在登录`);
    const result = await this.authService.loginWithUser(req.user);
    this.logger.log(`用户 ${req.user.username} 登录成功`);
    return result;
  }

  @ApiOperation({ summary: "刷新访问令牌" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        refresh_token: { type: "string", description: "刷新令牌" },
      },
      required: ["refresh_token"],
    },
    description: "刷新令牌请求",
  })
  @ApiResponse({
    status: 200,
    description: "令牌刷新成功",
    schema: {
      type: "object",
      properties: {
        access_token: { type: "string", description: "新的访问令牌" },
      },
      required: ["access_token"],
    },
  })
  @ApiResponse({ status: 401, description: "无效的刷新令牌" })
  @Post("refresh")
  async refreshToken(
    @Body() refreshData: Partial<RefreshTokenRequest> | null | undefined,
  ): Promise<RefreshTokenResponse> {
    if (!refreshData?.refresh_token) {
      this.logger.warn("刷新令牌请求缺少refresh_token");
      throw new UnauthorizedException("Refresh token is required");
    }
    this.logger.log("收到刷新令牌请求");
    const result = await this.authService.refreshToken(
      refreshData.refresh_token,
    );
    this.logger.log("刷新令牌成功");
    return result;
  }

  @ApiOperation({ summary: "用户登出" })
  @ApiHeader({ name: "Authorization", description: "Bearer令牌" })
  @ApiResponse({ status: 200, description: "登出成功" })
  @ApiResponse({ status: 401, description: "无效的授权头" })
  @Post("logout")
  async logout(
    @Headers("Authorization") authorization: string | null | undefined,
  ): Promise<void> {
    if (!authorization) {
      this.logger.warn("登出请求缺少Authorization头");
      throw new UnauthorizedException("Authorization header is required");
    }

    const tokenMatch = authorization.match(/^Bearer\s+(.*)$/);
    if (!tokenMatch || !tokenMatch[1]) {
      this.logger.warn("登出请求Authorization头格式无效");
      throw new UnauthorizedException("Invalid authorization header format");
    }

    const token = tokenMatch[1];
    this.logger.log("收到登出请求");
    await this.authService.logout(token);
    this.logger.log("登出成功");
  }

  @ApiOperation({ summary: "用户注册" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        username: { type: "string", description: "用户名" },
        email: { type: "string", description: "邮箱" },
        password: { type: "string", description: "密码" },
        display_name: { type: "string", description: "显示名称" },
      },
      required: ["username", "email", "password"],
    },
    description: "注册数据",
  })
  @ApiResponse({ status: 201, description: "用户注册成功" })
  @ApiResponse({ status: 400, description: "无效的注册数据" })
  @Post("register")
  async register(@Body() registerData: RegisterUserInput) {
    this.logger.log(`用户 ${registerData.username} 正在注册`);
    const result = await this.authService.register(registerData);
    this.logger.log(`用户 ${registerData.username} 注册成功`);
    return result;
  }
}

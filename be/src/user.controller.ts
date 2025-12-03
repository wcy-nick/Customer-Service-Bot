import {
  Controller,
  Get,
  Put,
  Body,
  Query,
  UseGuards,
  Req,
  Param,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiParam,
} from "@nestjs/swagger";
import { UserService } from "./user.service";
import { JwtAuthGuard } from "./auth/jwt-auth.guard";
import type {
  UserDto,
  UpdateProfileInput,
  UpdateRoleInput,
  GetUsersQuery,
  PaginatedResponse,
} from "./types/types";

@ApiTags("users")
@Controller("users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({ summary: "获取当前用户信息" })
  @ApiResponse({
    status: 200,
    description: "用户信息",
    schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "用户ID" },
        username: { type: "string", description: "用户名" },
        email: { type: "string", description: "邮箱" },
        display_name: { type: "string", description: "显示名称" },
        avatar_url: { type: "string", description: "头像URL" },
        role: { type: "string", description: "用户角色" },
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
      required: ["id", "username", "email", "role"],
    },
  })
  @ApiResponse({ status: 401, description: "未授权" })
  @UseGuards(JwtAuthGuard)
  @Get("profile")
  async getProfile(@Req() req: { user: { id: string } }): Promise<UserDto> {
    const userId = req.user.id;
    return this.userService.getProfile(userId);
  }

  @ApiOperation({ summary: "更新当前用户资料" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        display_name: { type: "string", description: "显示名称" },
        avatar_url: { type: "string", description: "头像URL" },
      },
    },
    description: "用户资料更新数据",
  })
  @ApiResponse({
    status: 200,
    description: "用户资料更新成功",
    schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "用户ID" },
        username: { type: "string", description: "用户名" },
        email: { type: "string", description: "邮箱" },
        display_name: { type: "string", description: "显示名称" },
        avatar_url: { type: "string", description: "头像URL" },
        role: { type: "string", description: "用户角色" },
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
      required: ["id", "username", "email", "role"],
    },
  })
  @ApiResponse({ status: 401, description: "未授权" })
  @UseGuards(JwtAuthGuard)
  @Put("profile")
  async updateProfile(
    @Req() req: { user: { id: string } },
    @Body() body: UpdateProfileInput,
  ): Promise<UserDto> {
    const userId = req.user.id;
    return this.userService.updateProfile(userId, body);
  }

  @ApiOperation({ summary: "获取用户列表" })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "页码",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "每页数量",
  })
  @ApiQuery({
    name: "search",
    required: false,
    type: String,
    description: "搜索关键词",
  })
  @ApiQuery({
    name: "role",
    required: false,
    type: String,
    description: "用户角色",
  })
  @ApiResponse({
    status: 200,
    description: "用户列表",
    schema: {
      type: "object",
      properties: {
        data: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string", description: "用户ID" },
              username: { type: "string", description: "用户名" },
              email: { type: "string", description: "邮箱" },
              display_name: { type: "string", description: "显示名称" },
              avatar_url: { type: "string", description: "头像URL" },
              role: { type: "string", description: "用户角色" },
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
            required: ["id", "username", "email", "role"],
          },
        },
        meta: {
          type: "object",
          properties: {
            total: { type: "number", description: "总记录数" },
            page: { type: "number", description: "当前页码" },
            limit: { type: "number", description: "每页数量" },
            total_pages: { type: "number", description: "总页数" },
          },
          required: ["total", "page", "limit", "total_pages"],
        },
      },
      required: ["data", "meta"],
    },
  })
  @ApiResponse({ status: 401, description: "未授权" })
  @UseGuards(JwtAuthGuard)
  @Get()
  async getUsers(
    @Query() query: GetUsersQuery,
  ): Promise<PaginatedResponse<UserDto>> {
    return this.userService.getUsers(query);
  }

  @ApiOperation({ summary: "更新用户角色" })
  @ApiParam({ name: "userId", type: String, description: "用户ID" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        role: {
          type: "string",
          enum: ["admin", "editor", "user"],
          description: "用户角色",
        },
      },
      required: ["role"],
    },
    description: "角色更新数据",
  })
  @ApiResponse({
    status: 200,
    description: "角色更新成功",
    schema: {
      type: "object",
      properties: {
        id: { type: "string", description: "用户ID" },
        username: { type: "string", description: "用户名" },
        email: { type: "string", description: "邮箱" },
        display_name: { type: "string", description: "显示名称" },
        avatar_url: { type: "string", description: "头像URL" },
        role: { type: "string", description: "用户角色" },
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
      required: ["id", "username", "email", "role"],
    },
  })
  @ApiResponse({ status: 401, description: "未授权" })
  @ApiResponse({ status: 403, description: "权限不足" })
  @ApiResponse({ status: 404, description: "用户不存在" })
  @UseGuards(JwtAuthGuard)
  @Put("role/:userId")
  async updateUserRole(
    @Req() req: { user: { id: string } },
    @Param("userId") userId: string,
    @Body() body: UpdateRoleInput,
  ): Promise<UserDto> {
    const currentUserId = req.user.id;
    return this.userService.updateUserRole(userId, body, currentUserId);
  }
}

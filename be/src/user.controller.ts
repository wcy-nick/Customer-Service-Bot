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
import { UserService } from "./user.service";
import { AuthGuard } from "./auth.guard";
import type {
  UserDto,
  UpdateProfileInput,
  UpdateRoleInput,
  GetUsersQuery,
  PaginatedResponse,
} from "./types/types";

@Controller("users")
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * 获取当前用户信息
   */
  @UseGuards(AuthGuard)
  @Get("profile")
  async getProfile(@Req() req: { user: { id: string } }): Promise<UserDto> {
    const userId = req.user.id;
    return this.userService.getProfile(userId);
  }

  /**
   * 更新当前用户资料
   */
  @UseGuards(AuthGuard)
  @Put("profile")
  async updateProfile(
    @Req() req: { user: { id: string } },
    @Body() body: UpdateProfileInput,
  ): Promise<UserDto> {
    const userId = req.user.id;
    return this.userService.updateProfile(userId, body);
  }

  /**
   * 获取用户列表
   */
  @UseGuards(AuthGuard)
  @Get()
  async getUsers(
    @Query() query: GetUsersQuery,
  ): Promise<PaginatedResponse<UserDto>> {
    return this.userService.getUsers(query);
  }

  /**
   * 更新用户角色
   */
  @UseGuards(AuthGuard)
  @Put("role/:userId")
  async updateUserRole(
    @Req() req: { user: { id: string } },
    @Param("id") userId: string,
    @Body() body: UpdateRoleInput,
  ): Promise<UserDto> {
    const currentUserId = req.user.id;
    return this.userService.updateUserRole(userId, body, currentUserId);
  }
}

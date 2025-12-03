import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBody,
  ApiResponse,
  ApiOperation,
  ApiHeader,
} from "@nestjs/swagger";
import { AuthService } from "./auth.service";
import type {
  LoginUserInput,
  RefreshTokenRequest,
  LoginResponse,
  RefreshTokenResponse,
  RegisterUserInput,
} from "./types/types";

@ApiTags("auth")
@Controller("api/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: "User login" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        username: { type: "string", description: "Username" },
        password: { type: "string", description: "Password" },
      },
      required: ["username", "password"],
    },
    description: "Login credentials",
  })
  @ApiResponse({
    status: 200,
    description: "Login successful",
    schema: {
      type: "object",
      properties: {
        access_token: { type: "string", description: "Access token" },
        refresh_token: { type: "string", description: "Refresh token" },
        user: {
          type: "object",
          properties: {
            id: { type: "string", description: "User ID" },
            username: { type: "string", description: "Username" },
            email: { type: "string", description: "Email" },
            display_name: { type: "string", description: "Display name" },
            avatar_url: { type: "string", description: "Avatar URL" },
            role: { type: "string", description: "User role" },
            created_at: {
              type: "string",
              format: "date-time",
              description: "Created at",
            },
            is_active: { type: "boolean", description: "Is active" },
            last_login_at: {
              type: "string",
              format: "date-time",
              description: "Last login at",
            },
          },
        },
      },
      required: ["access_token", "refresh_token", "user"],
    },
  })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  @Post("login")
  async login(@Body() loginData: LoginUserInput): Promise<LoginResponse> {
    return this.authService.login(loginData);
  }

  @ApiOperation({ summary: "Refresh access token" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        refresh_token: { type: "string", description: "Refresh token" },
      },
      required: ["refresh_token"],
    },
    description: "Refresh token request",
  })
  @ApiResponse({
    status: 200,
    description: "Token refreshed successfully",
    schema: {
      type: "object",
      properties: {
        access_token: { type: "string", description: "New access token" },
      },
      required: ["access_token"],
    },
  })
  @ApiResponse({ status: 401, description: "Invalid refresh token" })
  @Post("refresh")
  async refreshToken(
    @Body() refreshData: Partial<RefreshTokenRequest> | null | undefined,
  ): Promise<RefreshTokenResponse> {
    if (!refreshData?.refresh_token) {
      throw new UnauthorizedException("Refresh token is required");
    }
    return this.authService.refreshToken(refreshData.refresh_token);
  }

  @ApiOperation({ summary: "User logout" })
  @ApiHeader({ name: "Authorization", description: "Bearer token" })
  @ApiResponse({ status: 200, description: "Logout successful" })
  @ApiResponse({ status: 401, description: "Invalid authorization header" })
  @Post("logout")
  async logout(
    @Headers("Authorization") authorization: string | null | undefined,
  ): Promise<void> {
    if (!authorization) {
      throw new UnauthorizedException("Authorization header is required");
    }

    const tokenMatch = authorization.match(/^Bearer\s+(.*)$/);
    if (!tokenMatch || !tokenMatch[1]) {
      throw new UnauthorizedException("Invalid authorization header format");
    }

    const token = tokenMatch[1];
    return this.authService.logout(token);
  }

  @ApiOperation({ summary: "User registration" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        username: { type: "string", description: "Username" },
        email: { type: "string", description: "Email" },
        password: { type: "string", description: "Password" },
        display_name: { type: "string", description: "Display name" },
      },
      required: ["username", "email", "password"],
    },
    description: "Registration data",
  })
  @ApiResponse({ status: 201, description: "User registered successfully" })
  @ApiResponse({ status: 400, description: "Invalid registration data" })
  @Post("register")
  async register(@Body() registerData: RegisterUserInput) {
    return this.authService.register(registerData);
  }
}

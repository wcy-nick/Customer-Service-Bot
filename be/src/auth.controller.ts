import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
} from "@nestjs/common";
import { AuthService } from "./auth.service";
import type {
  LoginUserInput,
  RefreshTokenRequest,
  LoginResponse,
  RefreshTokenResponse,
  RegisterUserInput,
} from "./types/types";

@Controller("api/auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post("login")
  async login(@Body() loginData: LoginUserInput): Promise<LoginResponse> {
    return this.authService.login(loginData);
  }

  @Post("refresh")
  async refreshToken(
    @Body() refreshData: Partial<RefreshTokenRequest> | null | undefined,
  ): Promise<RefreshTokenResponse> {
    if (!refreshData?.refresh_token) {
      throw new UnauthorizedException("Refresh token is required");
    }
    return this.authService.refreshToken(refreshData.refresh_token);
  }

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

  @Post("register")
  async register(@Body() registerData: RegisterUserInput) {
    return this.authService.register(registerData);
  }
}

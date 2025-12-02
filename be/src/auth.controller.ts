import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

interface LoginRequest {
  username: string;
  password: string;
}

interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  display_name?: string;
}

interface RefreshTokenRequest {
  refresh_token: string;
}

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    username: string;
    email: string;
    display_name?: string;
    avatar_url?: string;
    role: string;
  };
}

interface RefreshTokenResponse {
  access_token: string;
}

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginData: LoginRequest): Promise<LoginResponse> {
    return this.authService.login(loginData);
  }

  @Post('refresh')
  async refreshToken(
    @Body() refreshData: RefreshTokenRequest,
  ): Promise<RefreshTokenResponse> {
    if (!refreshData.refresh_token) {
      throw new UnauthorizedException('Refresh token is required');
    }
    return this.authService.refreshToken(refreshData.refresh_token);
  }

  @Post('logout')
  async logout(@Headers('Authorization') authorization: string): Promise<void> {
    if (!authorization) {
      throw new UnauthorizedException('Authorization header is required');
    }

    const tokenMatch = authorization.match(/^Bearer\s+(.*)$/);
    if (!tokenMatch) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    const token = tokenMatch[1];
    return this.authService.logout(token);
  }

  @Post('register')
  async register(@Body() registerData: RegisterRequest) {
    return this.authService.register(registerData);
  }
}

import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UnauthorizedException } from "@nestjs/common";
import type { RefreshTokenRequest, RegisterUserInput } from "../types/types";
import { User, UserRole } from "../types/types";

describe("AuthController", () => {
  let authController: AuthController;

  // 创建模拟方法的引用变量
  let mockLogin: jest.Mock;
  let mockLoginWithUser: jest.Mock;
  let mockRefreshToken: jest.Mock;
  let mockLogout: jest.Mock;
  let mockRegister: jest.Mock;

  beforeEach(async () => {
    // 初始化模拟方法
    mockLogin = jest.fn();
    mockLoginWithUser = jest.fn();
    mockRefreshToken = jest.fn();
    mockLogout = jest.fn();
    mockRegister = jest.fn();

    // 模拟AuthService
    const mockAuthService = {
      login: mockLogin,
      loginWithUser: mockLoginWithUser,
      refreshToken: mockRefreshToken,
      logout: mockLogout,
      register: mockRegister,
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    authController = module.get<AuthController>(AuthController);
  });

  describe("login", () => {
    it("should login successfully", async () => {
      // Arrange
      const mockUser: User = {
        id: "user-1",
        username: "testuser",
        email: "test@example.com",
        displayName: "Test User",
        role: UserRole.user,
        passwordHash: "$2b$10$mockpasswordhash",
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        avatarUrl: null,
        lastLoginAt: new Date(),
      };

      const mockRequest = {
        user: mockUser,
      };

      const mockResponse = {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
        user: {
          id: "user-1",
          username: "testuser",
          email: "test@example.com",
          display_name: "Test User",
          role: "user",
        },
      };

      mockLoginWithUser.mockResolvedValue(mockResponse);

      // Act
      const result = await authController.login(mockRequest);

      // Assert
      expect(mockLoginWithUser).toHaveBeenCalledWith(mockRequest.user);
      expect(result).toEqual(mockResponse);
    });
  });

  describe("refreshToken", () => {
    it("should refresh token successfully", async () => {
      // Arrange
      const refreshData: RefreshTokenRequest = {
        refresh_token: "mock-refresh-token",
      };

      const mockResponse = {
        access_token: "new-access-token",
      };

      mockRefreshToken.mockResolvedValue(mockResponse);

      // Act
      const result = await authController.refreshToken(refreshData);

      // Assert
      expect(mockRefreshToken).toHaveBeenCalledWith(refreshData.refresh_token);
      expect(result).toEqual(mockResponse);
    });

    it("should throw UnauthorizedException if refresh token is missing", async () => {
      // Arrange
      const refreshData: RefreshTokenRequest = {
        refresh_token: "", // 空刷新令牌
      };

      // Act & Assert
      await expect(authController.refreshToken(refreshData)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(authController.refreshToken(refreshData)).rejects.toThrow(
        "Refresh token is required",
      );
    });

    it("should throw UnauthorizedException if refresh token is not provided", async () => {
      // Arrange
      const refreshData: Partial<RefreshTokenRequest> = {
        // 没有refresh_token字段
      };

      // Act & Assert
      await expect(authController.refreshToken(refreshData)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(authController.refreshToken(refreshData)).rejects.toThrow(
        "Refresh token is required",
      );
    });
  });

  describe("register", () => {
    it("should register user successfully", async () => {
      // Arrange
      const registerData: RegisterUserInput = {
        username: "newuser",
        email: "new@example.com",
        password: "password123",
        display_name: "New User",
      };

      const mockResponse = {
        id: "user-2",
        username: "newuser",
        email: "new@example.com",
        display_name: "New User",
        role: "user",
      };

      mockRegister.mockResolvedValue(mockResponse);

      // Act
      const result = await authController.register(registerData);

      // Assert
      expect(mockRegister).toHaveBeenCalledWith(registerData);
      expect(result).toEqual(mockResponse);
    });
  });

  describe("logout", () => {
    it("should logout successfully with valid authorization header", async () => {
      // Arrange
      const authorizationHeader = "Bearer mock-jwt-token";

      mockLogout.mockResolvedValue(undefined);

      // Act
      await authController.logout(authorizationHeader);

      // Assert
      expect(mockLogout).toHaveBeenCalledWith("mock-jwt-token");
    });

    it("should throw UnauthorizedException if authorization header is missing", async () => {
      // Arrange
      const authorizationHeader = undefined;

      // Act & Assert
      await expect(authController.logout(authorizationHeader)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(authController.logout(authorizationHeader)).rejects.toThrow(
        "Authorization header is required",
      );
    });

    it("should throw UnauthorizedException if authorization header format is invalid", async () => {
      // Arrange
      const authorizationHeader = "InvalidFormat mock-jwt-token";

      // Act & Assert
      await expect(authController.logout(authorizationHeader)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(authController.logout(authorizationHeader)).rejects.toThrow(
        "Invalid authorization header format",
      );
    });

    it("should throw UnauthorizedException if authorization header has no token", async () => {
      // Arrange
      const authorizationHeader = "Bearer ";

      // Act & Assert
      await expect(authController.logout(authorizationHeader)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(authController.logout(authorizationHeader)).rejects.toThrow(
        "Invalid authorization header format",
      );
    });
  });
});

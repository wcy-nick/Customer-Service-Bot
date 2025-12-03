import { Test, TestingModule } from "@nestjs/testing";
import {
  ExecutionContext,
  UnauthorizedException,
  InternalServerErrorException,
} from "@nestjs/common";
import { AuthGuard } from "./auth.guard";
import { UserService } from "./user.service";
import * as jwt from "jsonwebtoken";

// Mock the jwt module
jest.mock("jsonwebtoken");

describe("AuthGuard", () => {
  let authGuard: AuthGuard;
  let userService: jest.Mocked<UserService>;
  let mockExecutionContext: Partial<ExecutionContext>;

  // 创建模拟方法的引用变量
  let mockSwitchToHttp: jest.Mock;
  let mockGetRequest: jest.Mock;
  let mockGetUserById: jest.Mock;
  let mockJwtVerify: jest.Mock;

  beforeEach(async () => {
    // 初始化模拟方法
    mockSwitchToHttp = jest.fn();
    mockGetRequest = jest.fn();
    mockGetUserById = jest.fn();
    mockJwtVerify = jest.fn();

    // Mock jwt.verify
    (jwt.verify as jest.Mock).mockImplementation(mockJwtVerify);

    // Mock UserService
    userService = {
      getUserById: mockGetUserById,
    } as unknown as jest.Mocked<UserService>;

    // Mock ExecutionContext
    mockExecutionContext = {
      switchToHttp: mockSwitchToHttp.mockReturnValue({
        getRequest: mockGetRequest,
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthGuard,
        {
          provide: UserService,
          useValue: userService,
        },
      ],
    }).compile();

    authGuard = module.get<AuthGuard>(AuthGuard);
  });

  describe("canActivate", () => {
    it("should throw UnauthorizedException when no authorization header", async () => {
      // Arrange
      const mockRequest = {
        headers: {},
      };

      mockGetRequest.mockReturnValue(mockRequest);

      // Act & Assert
      await expect(
        authGuard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        authGuard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow("缺少授权令牌");
    });

    it("should throw UnauthorizedException when authorization header format is invalid", async () => {
      // Arrange
      const mockRequest = {
        headers: {
          authorization: "InvalidFormat token123",
        },
      };

      mockGetRequest.mockReturnValue(mockRequest);

      // Act & Assert
      await expect(
        authGuard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        authGuard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow("授权令牌格式无效");
    });

    it("should throw UnauthorizedException when authorization header has no token", async () => {
      // Arrange
      const mockRequest = {
        headers: {
          authorization: "Bearer ",
        },
      };

      mockGetRequest.mockReturnValue(mockRequest);

      // Act & Assert
      await expect(
        authGuard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        authGuard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow("授权令牌格式无效");
    });

    it("should throw UnauthorizedException when token is expired", async () => {
      // Arrange
      const mockRequest = {
        headers: {
          authorization: "Bearer expired-token",
        },
      };

      mockGetRequest.mockReturnValue(mockRequest);

      mockJwtVerify.mockImplementation(() => {
        const error = new Error("TokenExpiredError");
        error.name = "TokenExpiredError";
        throw error;
      });

      // Act & Assert
      await expect(
        authGuard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        authGuard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow("授权令牌已过期");
    });

    it("should throw UnauthorizedException when token is invalid", async () => {
      // Arrange
      const mockRequest = {
        headers: {
          authorization: "Bearer invalid-token",
        },
      };

      mockGetRequest.mockReturnValue(mockRequest);

      mockJwtVerify.mockImplementation(() => {
        const error = new Error("JsonWebTokenError");
        error.name = "JsonWebTokenError";
        throw error;
      });

      // Act & Assert
      await expect(
        authGuard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        authGuard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow("无效的授权令牌");
    });

    it("should throw UnauthorizedException when decoded token has no user_id", async () => {
      // Arrange
      const mockRequest = {
        headers: {
          authorization: "Bearer valid-token-no-userid",
        },
      };

      mockGetRequest.mockReturnValue(mockRequest);
      mockJwtVerify.mockReturnValue({});

      // Act & Assert
      await expect(
        authGuard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        authGuard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow("无效的授权令牌");
    });

    it("should throw UnauthorizedException when user does not exist", async () => {
      // Arrange
      const mockRequest = {
        headers: {
          authorization: "Bearer valid-token",
        },
      };

      mockGetRequest.mockReturnValue(mockRequest);
      mockJwtVerify.mockReturnValue({ user_id: "user-1" });
      mockGetUserById.mockResolvedValue(null);

      // Act & Assert
      await expect(
        authGuard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        authGuard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow("用户不存在或已被禁用");
    });

    it("should throw UnauthorizedException when user is not active", async () => {
      // Arrange
      const mockRequest = {
        headers: {
          authorization: "Bearer valid-token",
        },
      };

      mockGetRequest.mockReturnValue(mockRequest);
      mockJwtVerify.mockReturnValue({ user_id: "user-1" });
      mockGetUserById.mockResolvedValue({
        id: "user-1",
        username: "testuser",
        role: "user",
        email: "test@example.com",
        is_active: false,
      });

      // Act & Assert
      await expect(
        authGuard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        authGuard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow("用户不存在或已被禁用");
    });

    it("should throw InternalServerErrorException when unexpected error occurs", async () => {
      // Arrange
      const mockRequest = {
        headers: {
          authorization: "Bearer valid-token",
        },
      };

      mockGetRequest.mockReturnValue(mockRequest);
      mockJwtVerify.mockImplementation(() => {
        throw new Error("Unexpected error");
      });

      // Act & Assert
      await expect(
        authGuard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow(InternalServerErrorException);
      await expect(
        authGuard.canActivate(mockExecutionContext as ExecutionContext),
      ).rejects.toThrow("认证过程中发生错误");
    });

    it("should return true and inject user when authentication is successful", async () => {
      // Arrange
      const mockRequest: {
        headers: { authorization: string };
        user?: { id: string; username: string; role: string; email: string };
      } = {
        headers: {
          authorization: "Bearer valid-token",
        },
      };

      mockGetRequest.mockReturnValue(mockRequest);
      mockJwtVerify.mockReturnValue({ user_id: "user-1" });
      mockGetUserById.mockResolvedValue({
        id: "user-1",
        username: "testuser",
        role: "user",
        email: "test@example.com",
        is_active: true,
      });

      // Act
      const result = await authGuard.canActivate(
        mockExecutionContext as ExecutionContext,
      );

      // Assert
      expect(result).toBe(true);
      expect(mockRequest.user).toEqual({
        id: "user-1",
        username: "testuser",
        role: "user",
        email: "test@example.com",
      });
      expect(mockJwtVerify).toHaveBeenCalledWith(
        "valid-token",
        process.env.JWT_SECRET || "your-secret-key",
      );
      expect(mockGetUserById).toHaveBeenCalledWith("user-1");
    });
  });
});

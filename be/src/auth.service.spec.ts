import { Test, TestingModule } from "@nestjs/testing";
import { UnauthorizedException, ConflictException } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { PrismaService } from "./prisma.service";
import * as bcrypt from "bcrypt";
import * as jwt from "jsonwebtoken";

// Mock the bcrypt and jwt modules
jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashedPassword"),
  compare: jest.fn().mockResolvedValue(true),
  genSalt: jest.fn().mockResolvedValue("test-salt"),
}));
jest.mock("jsonwebtoken");

describe("AuthService", () => {
  let authService: AuthService;

  // 创建模拟方法的引用变量
  let mockUserFindUnique: jest.Mock;
  let mockUserFindFirst: jest.Mock;
  let mockUserCreate: jest.Mock;
  let mockUserUpdate: jest.Mock;
  let mockUserSessionCreate: jest.Mock;
  let mockUserSessionFindMany: jest.Mock;
  let mockUserSessionDeleteMany: jest.Mock;
  let mockBcryptHash: jest.Mock;
  let mockBcryptCompare: jest.Mock;
  let mockBcryptGenSalt: jest.Mock;
  let mockJwtSign: jest.Mock;

  beforeEach(async () => {
    // 初始化模拟方法
    mockUserFindUnique = jest.fn();
    mockUserFindFirst = jest.fn();
    mockUserCreate = jest.fn();
    mockUserUpdate = jest.fn();
    mockUserSessionCreate = jest.fn();
    mockUserSessionFindMany = jest.fn();
    mockUserSessionDeleteMany = jest.fn();
    mockBcryptHash = jest.fn();
    mockBcryptCompare = jest.fn();
    mockBcryptGenSalt = jest.fn();
    mockJwtSign = jest.fn();

    // Mock bcrypt
    (bcrypt.hash as jest.Mock).mockImplementation(mockBcryptHash);
    (bcrypt.compare as jest.Mock).mockImplementation(mockBcryptCompare);
    (bcrypt.genSalt as jest.Mock).mockImplementation(mockBcryptGenSalt);

    // Mock jwt
    (jwt.sign as jest.Mock).mockImplementation(mockJwtSign);

    // Mock PrismaService
    const mockPrismaService = {
      client: {
        user: {
          findUnique: mockUserFindUnique,
          findFirst: mockUserFindFirst,
          create: mockUserCreate,
          update: mockUserUpdate,
        },
        userSession: {
          create: mockUserSessionCreate,
          findMany: mockUserSessionFindMany,
          deleteMany: mockUserSessionDeleteMany,
        },
      },
    } as unknown as PrismaService;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  describe("register", () => {
    it("should register a new user successfully", async () => {
      // Arrange
      const registerDto = {
        username: "testuser",
        password: "password123",
        email: "test@example.com",
        role: "user",
        display_name: "Test User",
      };

      mockUserFindFirst.mockResolvedValue(null);
      mockBcryptGenSalt.mockResolvedValue("test-salt" as string);
      mockBcryptHash.mockResolvedValue("hashedPassword" as string);
      mockUserCreate.mockResolvedValue({
        id: "user-1",
        username: registerDto.username,
        email: registerDto.email,
        passwordHash: "hashedPassword",
        isActive: true,
        avatarUrl: null,
        displayName: registerDto.display_name,
        role: registerDto.role,
      });

      // Act
      const result = await authService.register(registerDto);

      // Assert
      expect(result).toEqual({
        id: "user-1",
        username: "testuser",
        email: "test@example.com",
        role: "user",
        display_name: "Test User",
        avatar_url: undefined,
      });
      expect(mockUserFindFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { username: registerDto.username },
            { email: registerDto.email },
          ],
        },
      });
      expect(mockBcryptHash).toHaveBeenCalledWith(
        registerDto.password,
        "test-salt",
      );
      expect(mockUserCreate).toHaveBeenCalledWith({
        data: {
          username: registerDto.username,
          email: registerDto.email,
          passwordHash: "hashedPassword",
          displayName: registerDto.display_name,
          role: "user",
        },
      });
    });

    it("should throw UnauthorizedException when username already exists", async () => {
      // Arrange
      const registerDto = {
        username: "existinguser",
        password: "password123",
        email: "existing@example.com",
        role: "user",
        display_name: "Existing User",
      };

      mockUserFindFirst.mockResolvedValue({
        id: "user-2",
        username: registerDto.username,
        email: registerDto.email,
        passwordHash: "hashedPassword",
        isActive: true,
        avatarUrl: null,
        displayName: registerDto.display_name,
        role: registerDto.role,
      });

      // Act & Assert
      const registerPromise = authService.register(registerDto);
      await expect(registerPromise).rejects.toThrow(ConflictException);
      await expect(registerPromise).rejects.toThrow("用户名已存在");
      expect(mockUserFindFirst).toHaveBeenCalledWith({
        where: {
          OR: [
            { username: registerDto.username },
            { email: registerDto.email },
          ],
        },
      });
    });
  });

  describe("login", () => {
    it("should login successfully with valid credentials", async () => {
      // Arrange
      const loginDto = {
        username: "testuser",
        password: "password123",
      };

      const user = {
        id: "user-1",
        username: "testuser",
        passwordHash: "hashedPassword",
        email: "test@example.com",
        role: "user",
        isActive: true,
        displayName: "Test User",
        avatarUrl: null,
      };

      mockUserFindUnique.mockResolvedValue(user);
      mockBcryptCompare.mockResolvedValue(true as boolean);
      mockJwtSign
        .mockReturnValueOnce("access-token" as string)
        .mockReturnValueOnce("refresh-token" as string);
      mockUserUpdate.mockResolvedValue({
        ...user,
        lastLoginAt: expect.any(Date) as Date,
      });

      // Act
      const result = await authService.login(loginDto);

      // Assert
      expect(result).toEqual({
        access_token: "access-token",
        refresh_token: "refresh-token",
        user: {
          id: "user-1",
          username: "testuser",
          email: "test@example.com",
          role: "user",
          display_name: "Test User",
          avatar_url: undefined,
        },
      });
      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: {
          username: loginDto.username,
        },
      });
      expect(mockBcryptCompare).toHaveBeenCalledWith(
        loginDto.password,
        user.passwordHash,
      );
      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: {
          id: user.id,
        },
        data: {
          lastLoginAt: expect.any(Date) as Date,
        },
      });
    });

    it("should throw UnauthorizedException when user not found", async () => {
      // Arrange
      const loginDto = {
        username: "nonexistent",
        password: "password123",
      };

      mockUserFindUnique.mockResolvedValue(null);

      // Act & Assert
      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(authService.login(loginDto)).rejects.toThrow(
        "用户名或密码错误",
      );
      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: {
          username: loginDto.username,
        },
      });
    });

    it("should throw UnauthorizedException when password is incorrect", async () => {
      // Arrange
      const loginDto = {
        username: "testuser",
        password: "wrongpassword",
      };

      const user = {
        id: "user-1",
        username: "testuser",
        passwordHash: "hashedPassword",
        email: "test@example.com",
        role: "user",
        isActive: true,
        displayName: "Test User",
        avatarUrl: null,
      };

      mockUserFindUnique.mockResolvedValue(user);
      mockBcryptCompare.mockResolvedValue(false);

      // Act & Assert
      await expect(authService.login(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(authService.login(loginDto)).rejects.toThrow(
        "用户名或密码错误",
      );
      expect(mockUserFindUnique).toHaveBeenCalledWith({
        where: {
          username: loginDto.username,
        },
      });
      expect(mockBcryptCompare).toHaveBeenCalledWith(
        loginDto.password,
        user.passwordHash,
      );
    });
  });

  describe("generateAccessToken and generateRefreshToken", () => {
    it("should generate valid JWT tokens", () => {
      // Arrange
      const user = {
        id: "user-1",
        username: "testuser",
        email: "test@example.com",
        role: "user",
      };

      mockJwtSign.mockReturnValue("token" as string);

      // Act
      const accessToken = authService.generateAccessToken(user);
      const refreshToken = authService.generateRefreshToken(user);

      // Assert
      expect(accessToken).toBe("token");
      expect(refreshToken).toBe("token");
      // 验证调用次数和参数
      expect(mockJwtSign).toHaveBeenCalledTimes(2); // 只计算当前测试中的调用

      // 检查第一个调用（access token）
      expect(mockJwtSign).toHaveBeenNthCalledWith(
        1,
        {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_SECRET || "your-secret-key",
        { expiresIn: "15m" },
      );

      // 检查第二个调用（refresh token）
      expect(mockJwtSign).toHaveBeenNthCalledWith(
        2,
        {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
        },
        process.env.JWT_REFRESH_SECRET || "your-refresh-secret-key",
        { expiresIn: "7d" },
      );
    });
  });

  describe("hashPassword and comparePasswords", () => {
    it("should hash a password correctly", async () => {
      // Arrange
      const password = "password123";
      const salt = "test-salt";
      const hashedPassword = "hashedPassword";

      mockBcryptGenSalt.mockResolvedValue(salt as string);
      mockBcryptHash.mockResolvedValue(hashedPassword as string);

      // Act
      const result = await authService["hashPassword"](password);

      // Assert
      expect(result).toBe(hashedPassword);
      expect(mockBcryptGenSalt).toHaveBeenCalledWith(10);
      expect(mockBcryptHash).toHaveBeenCalledWith(password, salt);
    });

    it("should compare passwords correctly", async () => {
      // Arrange
      const password = "password123";
      const hashedPassword = "hashedPassword";

      mockBcryptCompare.mockResolvedValue(true);

      // Act
      const result = await authService.comparePasswords(
        password,
        hashedPassword,
      );

      // Assert
      expect(result).toBe(true);
      expect(mockBcryptCompare).toHaveBeenCalledWith(password, hashedPassword);
    });
  });
});

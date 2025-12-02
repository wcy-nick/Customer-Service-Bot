import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaService } from "./prisma.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { AuthGuard } from "./auth.guard";

@Module({
  imports: [],
  controllers: [AppController, AuthController, UserController],
  providers: [AppService, PrismaService, AuthService, UserService, AuthGuard],
})
export class AppModule {}

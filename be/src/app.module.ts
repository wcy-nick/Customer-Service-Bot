import { Module } from "@nestjs/common";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaService } from "./prisma.service";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
import { AuthGuard } from "./auth.guard";
import { BusinessCategoryController } from "./business-category.controller";
import { BusinessCategoryService } from "./business-category.service";
import { ScenarioController } from "./scenario.controller";
import { ScenarioService } from "./scenario.service";
import { QdrantService } from "./qdrant.service";
import { DocumentController } from "./document.controller";
import { DocumentService } from "./document.service";
import { UploadController } from "./upload.controller";
import { UploadService } from "./upload.service";
import { ChatSessionController } from "./chat-session.controller";
import { ChatSessionService } from "./chat-session.service";

@Module({
  imports: [],
  controllers: [
    AppController,
    AuthController,
    UserController,
    BusinessCategoryController,
    ScenarioController,
    DocumentController,
    UploadController,
    ChatSessionController,
  ],
  providers: [
    AppService,
    PrismaService,
    AuthService,
    UserService,
    AuthGuard,
    BusinessCategoryService,
    ScenarioService,
    QdrantService,
    DocumentService,
    UploadService,
    ChatSessionService,
  ],
})
export class AppModule {}

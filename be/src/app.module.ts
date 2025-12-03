import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaService } from "./prisma.service";
import { UserController } from "./user.controller";
import { UserService } from "./user.service";
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
import { MessagesController } from "./messages.controller";
import { SearchController } from "./search.controller";
import { SearchService } from "./search.service";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { SyncController } from "./sync.controller";
import { SyncService } from "./sync.service";
import { EmbeddingModule } from "./embedding/embedding.module";
import { AuthModule } from "./auth/auth.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),
    EmbeddingModule,
    AuthModule,
  ],
  controllers: [
    AppController,
    UserController,
    BusinessCategoryController,
    ScenarioController,
    DocumentController,
    UploadController,
    ChatSessionController,
    MessagesController,
    SearchController,
    AnalyticsController,
    SyncController,
  ],
  providers: [
    AppService,
    PrismaService,
    UserService,
    BusinessCategoryService,
    ScenarioService,
    QdrantService,
    DocumentService,
    UploadService,
    ChatSessionService,
    SearchService,
    AnalyticsService,
    SyncService,
  ],
})
export class AppModule {}

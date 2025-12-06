import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";
import { ConfigService } from "@nestjs/config";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  const configService = app.get(ConfigService);

  const config = new DocumentBuilder()
    .setTitle("Customer Service Bot API")
    .setDescription("API documentation for Customer Service Bot backend")
    .setVersion("1.0")
    .addTag("auth", "Authentication related endpoints")
    .addTag("users", "User management endpoints")
    .addTag("business-categories", "Business category endpoints")
    .addTag("scenario-categories", "Scenario category endpoints")
    .addTag("documents", "Document management endpoints")
    .addTag("chat", "Chat session and message endpoints")
    .addTag("search", "Search and related questions endpoints")
    .addTag("analytics", "Analytics and reporting endpoints")
    .addTag("sync", "Data synchronization endpoints")
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api", app, documentFactory);

  const port = parseInt(configService.get("PORT") || "3001");
  await app.listen(port);
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap().catch((error) => {
  console.error("Error starting application:", error);
  process.exit(1);
});

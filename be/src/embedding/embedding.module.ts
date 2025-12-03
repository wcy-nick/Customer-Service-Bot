import { Module } from "@nestjs/common";
import { ZhipuEmbeddingService } from "./zhipu";

@Module({
  providers: [ZhipuEmbeddingService],
  exports: [ZhipuEmbeddingService],
})
export class EmbeddingModule {}

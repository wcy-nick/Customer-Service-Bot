import { Module } from "@nestjs/common";
import { ZhipuEmbeddingService } from "./zhipu";
import { SilconflowEmbeddingService } from "./siliconflow";
import { GiteeEmbeddingService } from "./gitee";
import { BaishanEmbeddingService } from "./baishan";

@Module({
  providers: [
    ZhipuEmbeddingService,
    SilconflowEmbeddingService,
    GiteeEmbeddingService,
    BaishanEmbeddingService,
  ],
  exports: [
    ZhipuEmbeddingService,
    SilconflowEmbeddingService,
    GiteeEmbeddingService,
    BaishanEmbeddingService,
  ],
})
export class EmbeddingModule {}

import { Module } from "@nestjs/common";
import { ZhipuEmbeddingService } from "./zhipu";
import { SiliconflowEmbeddingService } from "./siliconflow";
import { GiteeEmbeddingService } from "./gitee";
import { BaishanEmbeddingService } from "./baishan";

@Module({
  providers: [
    ZhipuEmbeddingService,
    SiliconflowEmbeddingService,
    GiteeEmbeddingService,
    BaishanEmbeddingService,
  ],
  exports: [
    ZhipuEmbeddingService,
    SiliconflowEmbeddingService,
    GiteeEmbeddingService,
    BaishanEmbeddingService,
  ],
})
export class EmbeddingModule {}

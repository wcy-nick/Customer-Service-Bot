import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ZhipuAIEmbeddings } from "@langchain/community/embeddings/zhipuai";

@Injectable()
export class ZhipuEmbeddingService {
  private embeddings: ZhipuAIEmbeddings;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>("ZHIPU_API_KEY");
    const model =
      this.configService.get<string>("EMBEDDING_MODEL") || "bge-small-zh";

    if (!apiKey) {
      throw new Error("ZHIPU_API_KEY is not set");
    }

    // 使用 LangChain 官方的 ZhipuAIEmbeddings
    // 注意：LangChain 的模型名称可能是 "embedding-2" 或 "embedding-3"
    // 如果使用 bge-small-zh，映射到 embedding-2（默认）
    let modelName: "embedding-2" | "embedding-3" | undefined = undefined;
    if (model === "bge-small-zh" || model === "embedding-2") {
      modelName = "embedding-2";
    } else if (model === "embedding-3") {
      modelName = "embedding-3";
    }
    // 如果模型名称不是标准的，让 LangChain 使用默认值

    this.embeddings = new ZhipuAIEmbeddings({
      apiKey,
      modelName,
    });
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    const embeddings = await this.embeddings.embedDocuments(texts);
    return embeddings;
  }

  async embedQuery(text: string): Promise<number[]> {
    const embedding = await this.embeddings.embedQuery(text);
    return embedding;
  }
}

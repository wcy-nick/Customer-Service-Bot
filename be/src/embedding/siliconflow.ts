import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BareEmbeddingService } from "./bare";

@Injectable()
export class SilconflowEmbeddingService extends BareEmbeddingService {
  protected readonly apiUrl = "https://api.siliconflow.cn/v1/embeddings";
  protected readonly apiKey: string;
  protected readonly model: string;
  protected readonly dimensions: number;

  constructor(private configService: ConfigService) {
    super();
    const apiKey = this.configService.get<string>("SILICONFLOW_API_KEY");
    const model = this.configService.get<string>("EMBEDDING_MODEL");
    const dimensions = this.configService.get<number>("EMBEDDING_DIMENSIONS");

    if (!apiKey) {
      throw new Error("SILICONFLOW_API_KEY is not set");
    }

    this.apiKey = apiKey;
    this.model = model || "BAAI/bge-large-zh-v1.5";
    this.dimensions = dimensions || 1024;
  }
}

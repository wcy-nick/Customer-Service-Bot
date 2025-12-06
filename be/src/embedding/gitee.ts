import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BareEmbeddingService } from "./bare";

@Injectable()
export class GiteeEmbeddingService extends BareEmbeddingService {
  protected readonly apiUrl = "https://ai.gitee.com/v1/embeddings";
  protected readonly apiKey: string;
  protected readonly model: string;
  protected readonly dimensions: number;

  constructor(private configService: ConfigService) {
    super();
    const apiKey = this.configService.get<string>("GITEE_API_KEY");
    const model = this.configService.get<string>("EMBEDDING_MODEL");
    const dimensions = parseInt(
      this.configService.get<string>("EMBEDDING_DIMENSIONS") || "1024",
    );

    if (!apiKey) {
      throw new Error("GITEE_API_KEY is not set");
    }

    this.apiKey = apiKey;
    this.model = model || "bge-m3";
    this.dimensions = dimensions;
  }
}

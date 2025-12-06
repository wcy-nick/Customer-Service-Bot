import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { BareEmbeddingService } from "./bare";

@Injectable()
export class BaishanEmbeddingService extends BareEmbeddingService {
  protected readonly apiUrl = "https://api.edgefn.net/v1/embeddings";
  protected readonly apiKey: string;
  protected readonly model: string;
  protected readonly dimensions: number;

  constructor(private configService: ConfigService) {
    super();
    const apiKey = this.configService.get<string>("BAISHAN_API_KEY");
    const model = this.configService.get<string>("EMBEDDING_MODEL");
    const dimensions = this.configService.get<number>("EMBEDDING_DIMENSIONS");

    if (!apiKey) {
      throw new Error("BAISHAN_API_KEY is not set");
    }

    this.apiKey = apiKey;
    this.model = model || "BAAI/bge-m3";
    this.dimensions = dimensions || 1024;
  }
}

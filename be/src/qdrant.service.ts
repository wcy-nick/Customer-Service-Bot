import {
  Injectable,
  Logger,
  OnModuleInit,
  ServiceUnavailableException,
} from "@nestjs/common";
import { QdrantClient } from "@qdrant/js-client-rest";
import { ConfigService } from "@nestjs/config";
import { BaishanEmbeddingService as EmbeddingService } from "./embedding/baishan";

export interface DocumentChunk {
  id: string;
  text: string;
  title: string;
  url: string;
  path: string[];
}

export interface RetrievedChunk extends DocumentChunk {
  score: number;
}

interface SearchPayload {
  text: string;
  title: string;
  url: string;
  path: string[];
}

@Injectable()
export class QdrantService implements OnModuleInit {
  private client: QdrantClient;
  public readonly defaultCollection: string;
  public static readonly defaultThreshold: number = 0.5;
  private readonly resetOnStartup: boolean;
  private readonly logger = new Logger(QdrantService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly embeddingService: EmbeddingService,
  ) {
    this.client = new QdrantClient({
      url: this.configService.get("QDRANT_URL"),
      host: this.configService.get("QDRANT_HOST"),
      port: parseInt(this.configService.get("QDRANT_PORT") || "6333"),
      apiKey: this.configService.get("QDRANT_API_KEY"),
    });

    this.defaultCollection =
      this.configService.get("QDRANT_COLLECTION") || "documents";
    this.resetOnStartup =
      this.configService.get("QDRANT_RESET_ON_STARTUP") === "true";
  }

  async onModuleInit() {
    await this.ensureCollection(this.defaultCollection, this.resetOnStartup);
  }

  async createCollection(name: string) {
    await this.client.createCollection(name, {
      vectors: {
        size: 1024,
        distance: "Cosine",
      },
    });
    await this.client.createPayloadIndex(name, {
      field_name: "path",
      field_schema: "keyword",
      wait: true,
    });
  }

  async resetCollection(name: string) {
    await this.client.deleteCollection(name);
    await this.createCollection(name);
  }

  /**
   * 确保集合存在，若不存在则创建。
   * 若已存在且reset为true，则重置集合。
   * @param name 集合名称
   * @param reset 是否重置集合（默认：false）
   * @returns 是否一定为空（即集合是否不存在或已重置）
   */
  async ensureCollection(name: string, reset: boolean = false) {
    const { exists } = await this.client.collectionExists(name);

    if (exists) {
      if (reset) {
        await this.resetCollection(name);
      }
    } else {
      await this.createCollection(name);
    }

    return !exists || reset;
  }

  async getCollections() {
    const result = await this.client.getCollections();
    const collections = result.collections;
    this.logger.log(`Collections: ${JSON.stringify(collections)}`);
    return collections;
  }

  async upsertDocuments(
    collection: string,
    documents: DocumentChunk[],
  ): Promise<boolean> {
    const texts = documents.map((doc) => doc.text);
    this.logger.verbose(`Embedding ${texts.length} documents`);

    const vectors: number[][] = [];
    for (let i = 0; i < 3; i++) {
      try {
        const embeddings = await this.embeddingService.embedDocuments(texts);
        vectors.push(...embeddings);
        break;
      } catch (error) {
        this.logger.error(`Attempt ${i + 1} failed embedding: ${error}`);
        if (error instanceof AggregateError) {
          for (const err of error.errors) {
            this.logger.error(err);
          }
        }

        // 等待重试
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }

    if (vectors.length === 0) {
      return false;
    }

    // 创建points数组
    const points = documents.map((doc, idx) => ({
      id: doc.id,
      vector: vectors[idx],
      payload: {
        text: doc.text,
        url: doc.url,
        path: doc.path,
        title: doc.title,
      },
    }));

    this.logger.verbose(
      `Upserting ${points.length} points to collection ${collection}`,
    );
    try {
      await this.client.upsert(collection, {
        wait: true,
        points,
      });
    } catch (error) {
      this.logger.error(`Upserting points: ${error}`);
      return false;
    }
    this.logger.verbose(
      `Upserted ${points.length} points to collection ${collection}`,
    );
    return true;
  }

  async retrieveRelevantChunks(
    collection: string,
    query: string,
    options: {
      limit?: number;
      path?: string;
      threshold?: number;
    } = {},
  ): Promise<RetrievedChunk[]> {
    this.logger.verbose(`Embedding query ${query}`);
    const queryVec: number[] = [];
    try {
      const embeddings = await this.embeddingService.embedQuery(query);
      queryVec.push(...embeddings);
    } catch (error) {
      if (error instanceof AggregateError) {
        for (const err of error.errors) {
          this.logger.error(err);
        }
      } else {
        this.logger.error(error);
      }
      throw new ServiceUnavailableException("Embedding service error");
    }

    const limit = options.limit || 5;
    const threshold = options.threshold ?? QdrantService.defaultThreshold;
    const pathFilter = options.path
      ? {
          key: "path",
          match: {
            value: options.path,
          },
        }
      : {};
    this.logger.verbose(
      `Searching collection ${collection} with path filter ${JSON.stringify(pathFilter)}`,
    );
    const results: RetrievedChunk[] = [];
    try {
      const [systemResp, userResp] = await Promise.all([
        this.client.search(this.defaultCollection, {
          vector: queryVec,
          limit,
          score_threshold: threshold,
          filter: { must: [pathFilter] },
        }),
        this.client.search(collection, {
          vector: queryVec,
          limit,
          score_threshold: threshold,
        }),
      ]);
      userResp.push(...systemResp);
      results.push(
        ...userResp.map((result) => {
          const payload = result.payload! as unknown as SearchPayload;
          return {
            id: String(result.id),
            score: result.score,
            ...payload,
          };
        }),
      );
    } catch (error) {
      this.logger.error(`Searching collection ${collection}: ${error}`);
      throw new ServiceUnavailableException("Retrieve service error");
    }

    results.splice(0, results.length, ...this.dedupChunks(results));

    const overview = results
      .map(
        ({ text, score, url }) =>
          `${text.substring(0, 20).replaceAll("\n", "\\n")}... (from: ${url}, size: ${text.length}, score: ${score.toFixed(3)})`,
      )
      .join("\n");
    this.logger.verbose(
      `Retrieved ${overview} for query ${query} (size: ${queryVec.length})`,
    );
    return results;
  }

  async deleteDocuments(collection: string, ids: string[]) {
    await this.client.delete(collection, {
      points: ids,
    });
  }

  dedupChunks(retrievedChunks: RetrievedChunk[]) {
    const uniqueDocsMap = new Map<string, RetrievedChunk>();
    for (const doc of retrievedChunks) {
      uniqueDocsMap.set(doc.text, doc);
    }
    return Array.from(uniqueDocsMap.values());
  }

  static buildContext(uniqueDocs: RetrievedChunk[], maxLength = 2000): string {
    // 3. 构建带有元数据的上下文
    const context: string[] = [];
    let totalLength = 0;

    for (let i = 0; i < uniqueDocs.length; i++) {
      const doc = uniqueDocs[i];

      const chunkWithContext = `[片段${i + 1}]
${doc.text}`;
      const chunkLength = chunkWithContext.length;

      // 4. 控制上下文总长度
      if (totalLength + chunkLength > maxLength) {
        break; // 达到最大长度限制，停止添加更多片段
      }
      context.push(chunkWithContext);
      totalLength += chunkLength + 2; // +2 for the newline characters
    }

    // 5. 处理空结果情况
    if (!context.length) {
      return "没有找到相关的文档片段。";
    }

    return context.join("\n".repeat(2));
  }
}

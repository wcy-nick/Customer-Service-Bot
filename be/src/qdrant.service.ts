import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { QdrantClient } from "@qdrant/js-client-rest";
import { randomUUID } from "crypto";
import { ConfigService } from "@nestjs/config";
import { BaishanEmbeddingService as EmbeddingService } from "./embedding/baishan";

export interface DocumentChunk {
  id: string;
  text: string;
  documentId: string;
  path: string[];
}

export interface RetrievedChunk extends DocumentChunk {
  score: number;
}

@Injectable()
export class QdrantService implements OnModuleInit {
  private client: QdrantClient;
  private readonly qdrantCollection: string;
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

    this.qdrantCollection =
      this.configService.get("QDRANT_COLLECTION") || "documents";
    this.resetOnStartup =
      this.configService.get("QDRANT_RESET_ON_STARTUP") === "true";
  }

  async onModuleInit() {
    await this.ensureCollection(this.resetOnStartup);
  }

  async createCollection() {
    await this.client.createCollection(this.qdrantCollection, {
      vectors: {
        size: 1024,
        distance: "Cosine",
      },
    });
    await this.client.createPayloadIndex(this.qdrantCollection, {
      field_name: "path",
      field_schema: "keyword",
      wait: true,
    });
  }

  async resetCollection() {
    await this.client.deleteCollection(this.qdrantCollection);
    await this.createCollection();
  }

  async ensureCollection(reset: boolean = false) {
    const exists = await this.client.collectionExists(this.qdrantCollection);

    if (exists) {
      if (reset) {
        await this.resetCollection();
      }
    } else {
      await this.createCollection();
    }
  }

  async getCollections() {
    const result = await this.client.getCollections();
    const collections = result.collections;
    this.logger.log(`Collections: ${JSON.stringify(collections)}`);
    return collections;
  }

  async upsertDocuments(documents: DocumentChunk[]): Promise<void> {
    // 使用embed方法获取嵌入向量
    const texts = documents.map((doc) => doc.text);
    this.logger.verbose(`Embedding ${texts.length} documents`);
    const vectors = await this.embeddingService.embedDocuments(texts);

    // 创建points数组
    const points = documents.map((doc, idx) => ({
      id: doc.id || randomUUID(),
      vector: vectors[idx],
      payload: {
        text: doc.text,
        documentId: doc.documentId,
        path: doc.path,
      },
    }));

    this.logger.verbose(
      `Upserting ${points.length} points to collection ${this.qdrantCollection}`,
    );
    await this.client.upsert(this.qdrantCollection, {
      wait: true,
      points,
    });
    this.logger.verbose(
      `Upserted ${points.length} points to collection ${this.qdrantCollection}`,
    );
  }

  async retrieveRelevantChunks(
    query: string,
    options: {
      limit?: number;
      path?: string;
    } = {},
  ): Promise<RetrievedChunk[]> {
    const queryVec = await this.embeddingService.embedQuery(query);

    const pathFilter = options.path
      ? {
          key: "path",
          match: {
            value: options.path,
          },
        }
      : {};
    // 修复Qdrant客户端搜索调用格式
    const resp = await this.client.search(this.qdrantCollection, {
      vector: queryVec,
      limit: options.limit || 5,
      filter: { must: [pathFilter] },
    });

    // 转换结果
    const results = resp.map((result) => {
      const payload = result.payload! as {
        text: string;
        documentId: string;
        path: string[];
      };
      return {
        id: String(result.id),
        score: result.score,
        text: payload.text,
        path: payload.path,
        documentId: payload.documentId,
      };
    });

    const overview = results
      .map(
        ({ text, score, documentId }) =>
          `${text.substring(0, 20).replaceAll("\n", "\\n")}... (from: ${documentId}, size: ${text.length}, score: ${score.toFixed(3)})`,
      )
      .join("\n");
    this.logger.verbose(
      `Retrieved ${overview} for query ${query} (size: ${queryVec.length})`,
    );
    return results;
  }

  buildContext(
    retrievedChunks: RetrievedChunk[],
    minScore = 0.5,
    maxLength = 2000,
  ): string {
    // 1. 过滤掉相似度分数过低的结果
    const filteredDocs = retrievedChunks.filter((doc) => doc.score >= minScore);

    // 2. 内容去重
    const uniqueDocsMap = new Map<string, RetrievedChunk>();
    filteredDocs.forEach((doc) => {
      if (!uniqueDocsMap.has(doc.text)) {
        uniqueDocsMap.set(doc.text, doc);
      }
    });
    const uniqueDocs = Array.from(uniqueDocsMap.values());

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

import dotenv from "dotenv";
import ms from "ms";

dotenv.config({ path: [".env.local", ".env"] });

export default {
  zhipuApiKey: process.env.ZHIPU_API_KEY || "",
  embeddingModel: process.env.EMBEDDING_MODEL || "bge-small-zh",
  port: Number(process.env.PORT || 3001),
  crawlIntervalMs: ms((process.env.CRAWL_INTERVAL as ms.StringValue) || "5m"),
  qdrantCollection: process.env.QDRANT_COLLECTION || "documents",
};

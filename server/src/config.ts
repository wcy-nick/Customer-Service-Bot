import dotenv from "dotenv";
import ms from "ms";

dotenv.config({ path: [".env.local", ".env"] });

export const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY || "";

export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "bge-small-zh";

export const PORT = Number(process.env.PORT || 3001);

export const CRAWL_INTERVAL_MS: number = ms(
  (process.env.CRAWL_INTERVAL as ms.StringValue) || "5m"
);

export const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || "documents";

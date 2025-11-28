import dotenv from "dotenv";

dotenv.config({ path: ['.env.local', '.env'] });

export const ZHIPU_API_KEY = process.env.ZHIPU_API_KEY || "";

export const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "bge-small-zh";

export const PORT = Number(process.env.PORT || 3001);

export const QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
export const QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || "documents";

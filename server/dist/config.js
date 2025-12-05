"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QDRANT_COLLECTION = exports.QDRANT_URL = exports.PORT = exports.EMBEDDING_MODEL = exports.ZHIPU_API_KEY = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.ZHIPU_API_KEY = process.env.ZHIPU_API_KEY || "";
exports.EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "bge-small-zh";
exports.PORT = Number(process.env.PORT || 3001);
exports.QDRANT_URL = process.env.QDRANT_URL || "http://localhost:6333";
exports.QDRANT_COLLECTION = process.env.QDRANT_COLLECTION || "documents";

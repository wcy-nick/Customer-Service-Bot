import { NestFactory } from "@nestjs/core";
import dotenv from "dotenv";
import { AppModule } from "./app.module";

async function bootstrap() {
  dotenv.config({ path: [".env.local", ".env"] });

  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();

/*
import { splitText } from "./rag.js";
import { upsertDocuments } from "./vectorStore.js";
import { buildContext } from "./rag.js";
import { createChatModel } from "./llm.js";
import { extractTextFromPDF, isPDFFile } from "./utils/pdfParser.js";
import * as crawler from "./crawler.js";

// 接收 PDF / 文本文件，自动解析并向量化
app.post("/api/upload", upload.single("file"), async (req, res) => {
    // 根据文件类型提取文本
    if (isPDFFile(filename)) {
      console.log(`正在解析PDF文件: ${filename}`);
      text = await extractTextFromPDF(filePath);
    } else {
      // 如果是文本文件，直接读取
      text = fs.readFileSync(filePath, "utf-8");
    }

    const chunks = await splitText(text);
    await upsertDocuments(chunks);
});

// 接收原始文本，分割 + embedding + 写入向量库
app.post("/api/embed", async (req, res) => {
  const chunks = await splitText(text);
  await upsertDocuments(chunks);
});

// SSE 流式 RAG 问答
app.get("/api/chat", async (req, res) => {
    const context = await buildContext(question, 5);
    const prompt = `你是一个商家知识库问答助手。根据以下知识库内容回答用户问题，如果知识中没有相关信息，请如实说明。\n\n知识库内容：\n${context}\n\n问题：${question}\n\n请用中文回答：`;
});
*/

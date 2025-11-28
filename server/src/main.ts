import express from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import ms from "ms";
import path from "path";
import { PORT, CRAWL_INTERVAL_MS } from "./config.js";
import { splitText } from "./rag.js";
import { upsertDocuments } from "./vectorStore.js";
import { buildContext } from "./rag.js";
import { createChatModel } from "./llm.js";
import { extractTextFromPDF, isPDFFile } from "./utils/pdfParser.js";
import * as crawler from "./crawler.js";

console.log(`爬虫任务间隔: ${ms(CRAWL_INTERVAL_MS)}`);
setInterval(async () => {
  console.log(`开始执行爬虫任务，间隔: ${CRAWL_INTERVAL_MS}`);
  await crawler.fetchAllArticles();
  console.log("爬虫任务执行完成");
}, CRAWL_INTERVAL_MS);

const app = express();
app.use(cors());
app.use(express.json());

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, uploadDir);
  },
  filename: function (_req, file, cb) {
    cb(
      null,
      Date.now() +
        "-" +
        Buffer.from(file.originalname, "latin1").toString("utf8")
    );
  },
});

const upload = multer({ storage });

// 接收 PDF / 文本文件，自动解析并向量化
app.post("/api/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "no file" });
    }

    const filePath = req.file.path;
    const filename = req.file.filename;
    let text = "";

    // 根据文件类型提取文本
    if (isPDFFile(filename)) {
      console.log(`正在解析PDF文件: ${filename}`);
      text = await extractTextFromPDF(filePath);
      console.log(`PDF解析完成，提取文本长度: ${text.length} 字符`);
    } else {
      // 如果是文本文件，直接读取
      text = fs.readFileSync(filePath, "utf-8");
      console.log(`读取文本文件: ${filename}，长度: ${text.length} 字符`);
    }

    text = text.trim();

    if (!text) {
      return res.status(400).json({ error: "文件内容为空或无法提取文本" });
    }

    // 自动进行文本分割和向量化
    console.log("开始向量化处理...");
    const chunks = await splitText(text);
    await upsertDocuments(chunks);

    return res.json({
      ok: true,
      filename: filename,
      path: filePath,
      chunks: chunks.length,
      message: `文件上传成功，已提取 ${text.length} 字符，生成 ${chunks.length} 个文本片段并写入向量库`,
    });
  } catch (e: any) {
    console.error("文件上传处理错误:", e);
    return res.status(500).json({ error: e.message || "文件处理失败" });
  }
});

// 接收原始文本，分割 + embedding + 写入向量库
app.post("/api/embed", async (req, res) => {
  let { text } = req.body as { text?: string };
  text = text?.trim() || "";
  if (!text) {
    return res.status(400).json({ error: "text is required" });
  }
  const chunks = await splitText(text);
  await upsertDocuments(chunks);
  return res.json({ ok: true, chunks: chunks.length });
});

// SSE 流式 RAG 问答
app.get("/api/chat", async (req, res) => {
  try {
    let question = (req.query.question as string) || "";
    question = question.trim();
    if (!question) {
      res.writeHead(400, {
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
        "Cache-Control": "no-cache",
      });
      res.write(
        `data: ${JSON.stringify({ error: "question is required" })}\n\n`
      );
      res.end();
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      Connection: "keep-alive",
      "Cache-Control": "no-cache",
    });

    const context = await buildContext(question, 5);
    const model = createChatModel();
    const prompt = `你是一个商家知识库问答助手。根据以下知识库内容回答用户问题，如果知识中没有相关信息，请如实说明。\n\n知识库内容：\n${context}\n\n问题：${question}\n\n请用中文回答：`;

    const stream = await model.stream(prompt);

    for await (const chunk of stream) {
      const text =
        typeof chunk.content === "string"
          ? chunk.content
          : String(chunk.content);
      res.write(`data: ${text}\n\n`);
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (e: any) {
    console.error(e);
    if (!res.headersSent) {
      res.status(500).json({ error: e.message || "internal error" });
    } else {
      res.write(
        `data: ${JSON.stringify({ error: e.message || "internal error" })}\n\n`
      );
      res.end();
    }
  }
});

app.listen(PORT, () =>
  console.log(`Server listening on http://localhost:${PORT}`)
);

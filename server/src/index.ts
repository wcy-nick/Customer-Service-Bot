import express, { Request, Response } from "express";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import path from "path";
import { PORT } from "./config";
import { splitText } from "./rag";
import { upsertDocuments } from "./vectorStore";
import { buildContext } from "./rag";
import { createChatModel } from "./llm";
import { extractTextFromPDF, isPDFFile } from "./utils/pdfParser";
import { extractTextFromJSON, isJSONFile, extractStructuredTextFromJSON } from "./utils/jsonParser";

// 扩展Express Request类型以支持multer的file属性
declare global {
  namespace Express {
    interface Request {
      file?: Express.Multer.File;
    }
  }
}

const app = express();
app.use(cors());
app.use(express.json());

const uploadDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (_req: Request, _file: Express.Multer.File, cb: (error: Error | null, destination: string) => void) {
    cb(null, uploadDir);
  },
  filename: function (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) {
    cb(null, Date.now() + "-" + Buffer.from(file.originalname, "latin1").toString("utf8"));
  },
});

const upload = multer({ storage });

// /api/upload: 接收 PDF / 文本文件，自动解析并向量化
app.post("/api/upload", upload.single("file"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "no file" });
    }

    const filePath = req.file.path;
    const filename = req.file.filename;
    let text = "";
    
    // 检查是否使用OCR方式处理PDF
    const useOcr = req.body.useOcr === "true" || req.query.useOcr === "true";
    
    // 根据文件类型提取文本
    if (isPDFFile(filename)) {
      console.log(`正在解析PDF文件: ${filename}`);
      if (useOcr) {
        console.log("使用OCR方式处理PDF");
        // 使用PaddleOCR方式处理，默认使用本地服务
        const { extractTextFromPDFForOCR } = require("./utils/pdfParser");
        text = await extractTextFromPDFForOCR(filePath, { 
          type: "paddleocr", 
          paddleOcrUrl: "http://127.0.0.1:9898/paddle/ocr"
        });
      } else {
        console.log("使用传统方式处理PDF");
        text = await extractTextFromPDF(filePath);
      }
      console.log(`PDF解析完成，提取文本长度: ${text.length} 字符`);
    } else if (isJSONFile(filename)) {
      console.log(`正在解析JSON文件: ${filename}`);
      // 使用结构化文本提取，保留更多的文档结构信息
      text = extractStructuredTextFromJSON(filePath);
      console.log(`JSON解析完成，提取文本长度: ${text.length} 字符`);
    } else {
      // 如果是文本文件，直接读取
      text = fs.readFileSync(filePath, "utf-8");
      console.log(`读取文本文件: ${filename}，长度: ${text.length} 字符`);
    }

    if (!text.trim()) {
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

// /api/embed: 接收原始文本，分割 + embedding + 写入向量库
app.post("/api/embed", async (req: Request, res: Response) => {
  try {
    const { text } = req.body as { text?: string };
    if (!text) {
      return res.status(400).json({ error: "text is required" });
    }
    const chunks = await splitText(text);
    await upsertDocuments(chunks);
    return res.json({ ok: true, chunks: chunks.length });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message || "internal error" });
  }
});

// /api/chat: 非流式 RAG 问答
app.post("/api/chat", async (req: Request, res: Response) => {
  try {
    const { question } = req.body as { question?: string };
    if (!question) {
      return res.status(400).json({ error: "question is required" });
    }
    const context = await buildContext(question, 5);
    const model = createChatModel();
    const prompt = `你是一个商家知识库问答助手。根据以下知识库内容回答用户问题，如果知识中没有相关信息，请如实说明。\n\n知识库内容：\n${context}\n\n问题：${question}\n\n请用中文回答：`;
    const resp = await model.invoke(prompt);
    return res.json({ answer: resp.content });
  } catch (e: any) {
    console.error(e);
    return res.status(500).json({ error: e.message || "internal error" });
  }
});

// /api/chat/stream: SSE 流式 RAG 问答
app.get("/api/chat/stream", async (req: Request, res: Response) => {
  try {
    const question = (req.query.question as string) || "";
    if (!question) {
      res.writeHead(400, {
        "Content-Type": "text/event-stream",
        Connection: "keep-alive",
        "Cache-Control": "no-cache",
      });
      res.write(`data: ${JSON.stringify({ error: "question is required" })}\n\n`);
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
      const text = typeof chunk.content === "string" ? chunk.content : String(chunk.content);
      res.write(`data: ${text}\n\n`);
    }
    res.write("data: [DONE]\n\n");
    res.end();
  } catch (e: any) {
    console.error(e);
    if (!res.headersSent) {
      res.status(500).json({ error: e.message || "internal error" });
    } else {
      res.write(`data: ${JSON.stringify({ error: e.message || "internal error" })}\n\n`);
      res.end();
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});





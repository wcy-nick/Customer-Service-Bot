"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const multer_1 = __importDefault(require("multer"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
const rag_1 = require("./rag");
const vectorStore_1 = require("./vectorStore");
const rag_2 = require("./rag");
const llm_1 = require("./llm");
const pdfParser_1 = require("./utils/pdfParser");
const jsonParser_1 = require("./utils/jsonParser");
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
const uploadDir = path_1.default.join(process.cwd(), "uploads");
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: function (_req, _file, cb) {
        cb(null, uploadDir);
    },
    filename: function (_req, file, cb) {
        cb(null, Date.now() + "-" + Buffer.from(file.originalname, "latin1").toString("utf8"));
    },
});
const upload = (0, multer_1.default)({ storage });
// /api/upload: 接收 PDF / 文本文件，自动解析并向量化
app.post("/api/upload", upload.single("file"), async (req, res) => {
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
        if ((0, pdfParser_1.isPDFFile)(filename)) {
            console.log(`正在解析PDF文件: ${filename}`);
            if (useOcr) {
                console.log("使用OCR方式处理PDF");
                // 使用PaddleOCR方式处理，默认使用本地服务
                const { extractTextFromPDFForOCR } = require("./utils/pdfParser");
                text = await extractTextFromPDFForOCR(filePath, {
                    type: "paddleocr",
                    paddleOcrUrl: "http://127.0.0.1:9898/paddle/ocr"
                });
            }
            else {
                console.log("使用传统方式处理PDF");
                text = await (0, pdfParser_1.extractTextFromPDF)(filePath);
            }
            console.log(`PDF解析完成，提取文本长度: ${text.length} 字符`);
        }
        else if ((0, jsonParser_1.isJSONFile)(filename)) {
            console.log(`正在解析JSON文件: ${filename}`);
            // 使用结构化文本提取，保留更多的文档结构信息
            text = (0, jsonParser_1.extractStructuredTextFromJSON)(filePath);
            console.log(`JSON解析完成，提取文本长度: ${text.length} 字符`);
        }
        else {
            // 如果是文本文件，直接读取
            text = fs_1.default.readFileSync(filePath, "utf-8");
            console.log(`读取文本文件: ${filename}，长度: ${text.length} 字符`);
        }
        if (!text.trim()) {
            return res.status(400).json({ error: "文件内容为空或无法提取文本" });
        }
        // 自动进行文本分割和向量化
        console.log("开始向量化处理...");
        const chunks = await (0, rag_1.splitText)(text);
        await (0, vectorStore_1.upsertDocuments)(chunks);
        return res.json({
            ok: true,
            filename: filename,
            path: filePath,
            chunks: chunks.length,
            message: `文件上传成功，已提取 ${text.length} 字符，生成 ${chunks.length} 个文本片段并写入向量库`,
        });
    }
    catch (e) {
        console.error("文件上传处理错误:", e);
        return res.status(500).json({ error: e.message || "文件处理失败" });
    }
});
// /api/embed: 接收原始文本，分割 + embedding + 写入向量库
app.post("/api/embed", async (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ error: "text is required" });
        }
        const chunks = await (0, rag_1.splitText)(text);
        await (0, vectorStore_1.upsertDocuments)(chunks);
        return res.json({ ok: true, chunks: chunks.length });
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message || "internal error" });
    }
});
// /api/chat: 非流式 RAG 问答
app.post("/api/chat", async (req, res) => {
    try {
        const { question } = req.body;
        if (!question) {
            return res.status(400).json({ error: "question is required" });
        }
        const context = await (0, rag_2.buildContext)(question, 5);
        const model = (0, llm_1.createChatModel)();
        const prompt = `你是一个商家知识库问答助手。根据以下知识库内容回答用户问题，如果知识中没有相关信息，请如实说明。\n\n知识库内容：\n${context}\n\n问题：${question}\n\n请用中文回答：`;
        const resp = await model.invoke(prompt);
        return res.json({ answer: resp.content });
    }
    catch (e) {
        console.error(e);
        return res.status(500).json({ error: e.message || "internal error" });
    }
});
// /api/chat/stream: SSE 流式 RAG 问答
app.get("/api/chat/stream", async (req, res) => {
    try {
        const question = req.query.question || "";
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
        const context = await (0, rag_2.buildContext)(question, 5);
        const model = (0, llm_1.createChatModel)();
        const prompt = `你是一个商家知识库问答助手。根据以下知识库内容回答用户问题，如果知识中没有相关信息，请如实说明。\n\n知识库内容：\n${context}\n\n问题：${question}\n\n请用中文回答：`;
        const stream = await model.stream(prompt);
        for await (const chunk of stream) {
            const text = typeof chunk.content === "string" ? chunk.content : String(chunk.content);
            res.write(`data: ${text}\n\n`);
        }
        res.write("data: [DONE]\n\n");
        res.end();
    }
    catch (e) {
        console.error(e);
        if (!res.headersSent) {
            res.status(500).json({ error: e.message || "internal error" });
        }
        else {
            res.write(`data: ${JSON.stringify({ error: e.message || "internal error" })}\n\n`);
            res.end();
        }
    }
});
app.listen(config_1.PORT, () => {
    console.log(`Server listening on http://localhost:${config_1.PORT}`);
});

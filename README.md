## 商家知识库 RAG Demo（bge-small-zh + 智谱 GLM + LangChain.js + SSE）

### 技术栈

- **后端**：Node.js, Express, TypeScript, LangChain.js, Qdrant
- **前端**：React, TypeScript, Vite
- **向量数据库**：Qdrant
- **大语言模型**：智谱 AI GLM
- **嵌入模型**：bge-small-zh
- **OCR 技术**：Tesseract.js, PaddleOCR (可选)
- **PDF 处理**：pdfjs-dist

### 目录结构

```
├── client/              # 前端代码
│   ├── src/            # 前端源码
│   └── package.json    # 前端依赖
├── server/              # 后端代码
│   ├── src/            # 后端源码
│   │   ├── pdf/        # PDF 处理模块
│   │   │   ├── extractImages.ts # 图像提取功能
│   │   │   ├── ocr.ts           # OCR 功能实现
│   │   │   └── pdfParser.ts     # PDF 解析器
│   │   ├── embedding/  # 嵌入模型
│   │   ├── llm/        # 大语言模型
│   │   ├── rag/        # RAG 核心逻辑
│   │   └── index.ts    # 后端入口
│   ├── scripts/        # 脚本工具
│   │   ├── importPdf.ts        # PDF 导入脚本
│   │   ├── importFeishuJson.ts # 飞书 JSON 导入脚本
│   │   └── testVectorStore.ts  # 向量库测试脚本
│   └── uploads/        # 文件上传目录
└── README.md           # 项目说明文档
```

### 环境准备

1. **安装依赖**

```bash
# 安装后端依赖
cd server
npm install

# 安装前端依赖
cd ../client
npm install
```

2. **启动 Qdrant 向量数据库**

```bash
docker run -d -p 6333:6333 -p 6334:6334 --name qdrant qdrant/qdrant:v1.7.3
```

3. **配置环境变量**

在 `server/.env` 文件中配置必要的环境变量：

```dotenv
# 智谱 AI API Key
ZHIPU_API_KEY=your_zhipu_api_key

# 嵌入模型（可选，默认为 bge-small-zh）
EMBEDDING_MODEL=BAAI/bge-small-zh

# PaddleOCR 服务地址（可选，使用 PaddleOCR 时需要配置）
PADDLE_OCR_URL=http://localhost:8866/predict/ocr_system
```

### 配置项说明

| 配置项 | 说明 | 默认值 |
| ---- | ---- | ---- |
| ZHIPU_API_KEY | 智谱 AI API 密钥 | 必填 |
| EMBEDDING_MODEL | 嵌入模型名称 | BAAI/bge-small-zh |
| PADDLE_OCR_URL | PaddleOCR 服务地址 | - |
| QDRANT_URL | Qdrant 向量数据库地址 | http://localhost:6333 |
| COLLECTION_NAME | 向量数据库集合名称 | knowledge_base |

### 运行方式

1. **启动后端服务**

```bash
cd server
npm run dev
```

后端服务默认运行在 `http://localhost:3001`

2. **启动前端服务**

```bash
cd client
npm run dev
```

前端服务默认运行在 `http://localhost:5174`（如果 5173 端口被占用）

### 功能说明

1. **文件上传与解析**
   - 支持上传 PDF 和 TXT 文件
   - PDF 文件解析支持文本和图像提取
   - 提供 OCR 功能用于识别图像中的文字

2. **向量存储**
   - 使用 Qdrant 存储文本向量
   - 支持批量导入和检索

3. **智能问答**
   - 基于 RAG 技术的问答系统
   - 支持上下文理解和相关知识检索

4. **命令行工具**
   - 提供 PDF 导入脚本
   - 支持 OCR 选项

### OCR 功能说明

1. **默认 OCR 引擎**
   - 使用 Tesseract.js 作为默认 OCR 引擎
   - 支持多种语言（默认包括中文和英文）

2. **PaddleOCR 选项**
   - 可选择使用 PaddleOCR 提高识别准确率
   - 需要额外启动 PaddleOCR 服务：

     ```bash
     docker run -dp 8866:8866 registry.baidubce.com/paddlepaddle/paddleocr:2.6.1.3
     ```

   - 配置环境变量 `PADDLE_OCR_URL=http://localhost:8866/predict/ocr_system`

3. **使用方式**
   - 前端：上传 PDF 文件时勾选 "使用 OCR 识别图片中的文字"
   - 命令行：使用 `--useOcr` 参数

### 使用示例

1. **通过前端界面使用**
   - 启动前后端服务
   - 访问前端页面（默认 http://localhost:5174）
   - 上传 PDF 或 TXT 文件，可选择 "使用 OCR 识别图片中的文字"
   - 上传完成后，输入问题进行智能问答

2. **通过命令行导入 PDF**
   - 基本使用：
     ```bash
     cd server
     npx ts-node scripts/importPdf.ts --pdfPath ../path/to/your.pdf
     ```
   - 使用 OCR 功能：
     ```bash
     cd server
     npx ts-node scripts/importPdf.ts --pdfPath ../path/to/your.pdf --useOcr
     ```

### API 接口

1. **POST /api/upload**
   - 上传文件并解析
   - 参数：
     - `file`：上传的文件
     - `useOcr`：是否使用 OCR（可选，默认为 false）
   - 返回：文件解析结果和向量存储状态

2. **POST /api/chat**
   - 智能问答接口
   - 参数：
     - `question`：用户问题
   - 返回：流式回答

3. **POST /api/embed**
   - 文本嵌入接口
   - 参数：
     - `text`：需要嵌入的文本
   - 返回：文本向量

### 扩展功能

#### 已实现功能

1. **图片 OCR**：在 PDF 处理中支持提取图片并进行 OCR 文字识别
2. **命令行工具**：提供 PDF 导入脚本，支持 OCR 选项

#### 扩展建议

1. **语音转写**：上传音频后转写为文本，同样写入向量库
2. **多语言支持**：扩展支持更多语言的 OCR 和嵌入模型

### 注意事项

1. 首次使用需要配置智谱 AI API Key
2. 使用 OCR 功能时，Tesseract.js 会自动下载语言包，首次使用可能较慢
3. 使用 PaddleOCR 可以获得更高的识别准确率，但需要额外的 Docker 环境
4. 大型 PDF 文件的处理可能需要较长时间
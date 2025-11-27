## 商家知识库 RAG Demo（bge-small-zh + 智谱 GLM + LangChain.js + SSE）

### 一、技术栈
- **后端**：Node.js + TypeScript + Express + LangChain.js
- **Embedding**：智谱 `bge-small-zh`（通过智谱 Embedding API 调用）
- **LLM**：智谱 GLM（示例使用 `glm-4`）
- **向量库**：Qdrant（本地或云端均可）
- **前端**：Vite + React + TypeScript
- **流式响应**：Server-Sent Events（SSE）

### 二、目录结构
- `server/`：后端服务
  - `src/index.ts`：Express 入口，提供 `/api/upload` `/api/embed` `/api/chat` `/api/chat/stream`
  - `src/embedding/zhipuEmbedding.ts`：调用智谱 Embedding（bge-small-zh）
  - `src/vectorStore.ts`：Qdrant 向量库读写
  - `src/rag.ts`：文本分割 + 检索构造上下文
  - `src/llm.ts`：智谱 GLM Chat 模型封装
- `client/`：前端 React 应用
  - `src/App.tsx`：文档输入 + 向量化 + 流式问答界面

### 三、环境准备

1. 安装依赖
- 后端：
  ```bash
  cd server
  npm install
  ```
- 前端：
  ```bash
  cd client
  npm install
  ```

> **注意（Windows PowerShell 用户）**：如果遇到"无法加载文件 npm.ps1，因为在此系统上禁止运行脚本"的错误，请使用 `npm.cmd` 替代 `npm`，例如：
> ```bash
> npm.cmd install --legacy-peer-deps
> ```
> 或者修改 PowerShell 执行策略（需要管理员权限）：
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

2. 启动 Qdrant（向量数据库）

**方式一：使用 Docker（推荐）**

首先确保已安装 Docker Desktop：
- Windows：下载并安装 [Docker Desktop for Windows](https://www.docker.com/products/docker-desktop/)
- 安装完成后，启动 Docker Desktop，确保 Docker 服务正在运行

然后运行以下命令启动 Qdrant：
```bash
docker run -d -p 6333:6333 -p 6334:6334 -v qdrant_storage:/qdrant/storage --name qdrant qdrant/qdrant
```

参数说明：
- `-d`：后台运行容器
- `-p 6333:6333`：映射 HTTP API 端口
- `-p 6334:6334`：映射 gRPC 端口
- `-v qdrant_storage:/qdrant/storage`：持久化数据存储
- `--name qdrant`：容器名称

验证 Qdrant 是否启动成功：
- 访问 http://localhost:6333/dashboard 查看 Qdrant 控制台
- 或运行 `docker ps` 查看容器状态

**方式二：使用 Qdrant Cloud（无需本地安装）**

1. 访问 [Qdrant Cloud](https://cloud.qdrant.io/) 注册账号
2. 创建免费集群
3. 获取集群的 URL 和 API Key
4. 在 `server/.env` 中配置：
   ```bash
   QDRANT_URL=https://你的集群地址.qdrant.io
   QDRANT_API_KEY=你的API密钥
   ```

**方式三：本地安装 Qdrant（不使用 Docker）**

Windows 用户可以使用 Qdrant 的预编译二进制文件：
1. 访问 [Qdrant 发布页面](https://github.com/qdrant/qdrant/releases)
2. 下载 Windows 版本
3. 解压并运行 `qdrant.exe`

3. 配置环境变量（在 `server/.env` 中）：

**步骤：**
1. 在 `server` 目录下创建 `.env` 文件（如果不存在）
2. 复制以下内容到 `.env` 文件中，并替换相应的值：

```bash
ZHIPU_API_KEY=你的智谱APIKey
EMBEDDING_MODEL=bge-small-zh
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=documents
PORT=3001
```

**配置项说明：**
- `ZHIPU_API_KEY`：智谱 AI 的 API Key
  - **获取步骤（详细）：**
    1. 访问 [智谱 AI 开放平台](https://open.bigmodel.cn/)
    2. 点击右上角"登录"或"注册"按钮
    3. 如果未注册，填写手机号/邮箱完成注册并验证
    4. 登录后，进入"控制台"或"API 管理"页面
    5. 找到"API Key"或"密钥管理"选项
    6. 点击"创建 API Key"或"新建密钥"
    7. 输入密钥名称（如：`rag-demo`），确认创建
    8. **重要**：创建成功后，立即复制 API Key（通常以 `zhipu-` 开头的一串字符），因为关闭页面后可能无法再次查看完整密钥
    9. 将复制的 API Key 粘贴到 `.env` 文件中，替换 `你的智谱APIKey`
  - **示例格式**：`ZHIPU_API_KEY=zhipu-abc123def456ghi789jkl012mno345pqr678`
- `EMBEDDING_MODEL`：嵌入模型名称
  - 支持的值：`bge-small-zh`（会自动映射到 `embedding-2`）、`embedding-2`、`embedding-3`
  - 默认值：`bge-small-zh`（中文优化，对应 `embedding-2`）
  - 注意：代码使用 LangChain 的官方 ZhipuAIEmbeddings，会自动处理模型映射
- `QDRANT_URL`：Qdrant 向量数据库的地址
  - 本地 Docker：`http://localhost:6333`
  - Qdrant Cloud：`https://你的集群地址.qdrant.io`（如果使用云端服务）
- `QDRANT_COLLECTION`：向量集合名称，默认 `documents`
- `PORT`：后端服务端口，默认 `3001`

**如果使用 Qdrant Cloud，还需要添加：**
```bash
QDRANT_API_KEY=你的Qdrant API密钥
```

**示例（使用本地 Qdrant）：**
```bash
ZHIPU_API_KEY=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
EMBEDDING_MODEL=bge-small-zh
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=documents
PORT=3001
```

### 四、运行方式

1. 启动后端
```bash
```

2. 启动前端
```bash
cd client
npm run dev
```

3. 在浏览器访问
- 一般为 `http://localhost:5173`

### 五、功能说明

- **/api/upload**（文件上传并自动向量化）
  - 支持上传 PDF 或 TXT 文件
  - 自动解析 PDF 文件提取文本内容
  - 自动进行文本分割、向量化并写入 Qdrant
  - 输入：`multipart/form-data`，字段名 `file`
  - 返回：`{ ok: true, filename: string, chunks: number, message: string }`
  - 流程：文件上传 → PDF解析/文本读取 → 文本分割 → 向量化 → 写入向量库

- **/api/embed**（手动输入文本并向量化）
  - 输入：`{ text: string }`
  - 流程：文本 → LangChain `RecursiveCharacterTextSplitter` → 智谱 bge-small-zh 向量化 → 写入 Qdrant。
  - 返回：`{ ok: true, chunks: number }`

- **/api/chat**
  - 输入：`{ question: string }`
  - 流程：问题 → Qdrant 相似度检索 → 拼接成上下文 Prompt → 调用智谱 GLM → 一次性返回答案。

- **/api/chat/stream**
  - 输入：`GET /api/chat/stream?question=...`
  - 使用智谱 GLM 流式接口，将 token 通过 SSE 持续推送前端。

- **前端 App**
  - **左侧面板 - 创建知识文档**：
    - **方式一：文件上传**：支持上传 PDF 或 TXT 文件，自动解析并向量化
    - **方式二：手动输入**：在文本框中粘贴或输入文档内容，点击"提交到向量库"
  - **右侧面板 - 智能问答**：
    - 输入用户问题，点击"开始问答"
    - 使用 SSE 流式显示 LLM 生成的答案
    - 实时显示答案生成过程

### 六、使用示例

#### 创建知识库的两种方式

**方式一：上传 PDF 文件**
1. 在左侧面板选择"方式一：上传文件（PDF/TXT）"
2. 点击文件选择按钮，选择 PDF 或 TXT 文件
3. 系统自动解析文件内容、分割文本、向量化并存储
4. 看到成功提示："✅ 文件处理成功，生成 X 个文本片段"

**方式二：手动输入文本**
1. 在左侧面板的"方式二：手动输入文本"区域
2. 在文本框中粘贴或输入文档内容
3. 点击"提交到向量库"按钮
4. 看到成功提示："✅ 已写入向量库，切片数量：X"

#### 智能问答
1. 在右侧面板输入问题（如："你们的退货政策是什么？"）
2. 点击"开始问答"按钮
3. 实时查看答案生成过程（流式显示）
4. 答案基于已上传的知识库内容生成

### 七、多模态扩展建议

- **图片 OCR**：在 `/api/upload` 中扩展支持图片格式，调用 OCR（如 `tesseract.js` 或三方云 OCR），将识别文本走同样的分割 + 向量化流程。
- **语音转写**：上传音频后，用 Whisper/科大讯飞转文字，再走 RAG。
- **视频**：抽帧 + OCR + 音频转写，合并文本后同样写入向量库。
- **Word/Excel**：扩展支持 `.docx`、`.xlsx` 等 Office 文档格式。




# 客户服务机器人后端项目

## 架构概述

本项目是一个基于Node.js和Express的客户服务机器人后端服务，实现了以下核心功能：

- **文件处理**：支持PDF和TXT文件的上传和解析
- **向量存储**：使用Qdrant向量数据库存储文档嵌入向量
- **嵌入服务**：集成智谱AI嵌入模型，将文本转换为向量表示
- **RAG实现**：实现检索增强生成，提高回答质量和相关性
- **AI问答**：集成智谱AI聊天模型(glm-4)，提供智能问答和流式响应
- **API接口**：提供RESTful API和流式SSE接口

## 文件结构

```
server/
├── src/
│   ├── embedding/
│   │   └── zhipuEmbedding.ts  # 智谱AI嵌入服务实现
│   ├── utils/
│   ├── config.ts              # 应用配置和环境变量加载
│   ├── index.ts               # 主服务器入口，API路由定义
│   ├── llm.ts                 # 语言模型初始化和配置
│   ├── rag.ts                 # 检索增强生成(RAG)实现
│   └── vectorStore.ts         # 向量存储管理和检索
├── uploads/                   # 文件上传临时存储目录
├── .env                       # 环境变量配置文件
├── package-lock.json          # 依赖版本锁定文件
├── package.json               # 项目配置和依赖声明
└── tsconfig.json              # TypeScript配置
```

## 核心文件作用

### config.ts

应用配置文件，负责：

- 使用dotenv加载环境变量
- 导出应用配置项，包括API密钥、模型名称、端口号等
- 配置默认值和环境变量回退机制

### llm.ts

语言模型配置和初始化：

- 导入并配置ChatZhipuAI类
- 创建createChatModel函数，使用API密钥和指定模型初始化ChatZhipuAI实例
- 支持模型参数配置

### vectorStore.ts

向量存储管理：

- 初始化Qdrant客户端连接
- 实现ensureCollection方法，确保向量集合存在
- 实现upsertDocuments方法，将文档分块、嵌入并存储到Qdrant
- 实现retrieveRelevantChunks方法，通过嵌入查询搜索相关文档块

### zhipuEmbedding.ts

嵌入服务实现：

- 初始化ZhipuAI嵌入模型
- 实现embedDocuments和embedQuery方法
- 处理模型名称映射和API错误
- 提供批量嵌入和单文本嵌入功能

### rag.ts

检索增强生成实现：

- 实现基于检索结果构建提示的功能
- 结合上下文信息优化回答质量

### index.ts

服务器主入口和API定义：

- 初始化Express服务器
- 配置中间件（CORS、静态文件、文件上传等）
- 定义和实现API路由：
  - `/api/chat`：非流式AI问答接口
  - `/api/chat/stream`：基于SSE的流式AI问答接口
  - `/api/embed`：文本嵌入接口
  - `/api/upload`：文件上传和处理接口
- 启动服务器并监听指定端口

## API接口说明

### 1. POST /api/chat

非流式AI问答接口

**请求参数**：

```json
{
  "query": "你的问题"
}
```

**响应**：

```json
{
  "answer": "AI生成的回答"
}
```

### 2. GET /api/chat/stream

基于SSE的流式AI问答接口

**请求参数**：

- query: 问题文本（URL参数）

**响应**：

- 流式文本响应，逐字显示AI生成的回答

### 3. POST /api/embed

文本嵌入接口，将文本内容添加到知识库

**请求参数**：

```json
{
  "text": "要添加到知识库的文本内容"
}
```

**响应**：

```json
{
  "status": "success",
  "message": "文本已成功添加到知识库"
}
```

### 4. POST /api/upload

文件上传和处理接口

**请求参数**：

- file: PDF或TXT文件（FormData格式）

**响应**：

```json
{
  "status": "success",
  "message": "文件处理成功并添加到知识库"
}
```

## 配置与环境变量

### 环境变量配置 (.env)

```dotenv
# .env 文件示例

# 嵌入模型配置
EMBEDDING_MODEL=bge-small-zh

# 智谱AI API密钥（请添加您的实际API密钥）
ZHIPU_API_KEY=your_actual_api_key_here

# 服务器配置
PORT=3001

# Qdrant向量数据库配置
QDRANT_URL=http://localhost:6333
QDRANT_COLLECTION=documents
```

**注意**：默认情况下，`.env`文件中可能不包含`ZHIPU_API_KEY`。您需要手动添加此环境变量，或者在系统环境变量中设置它。

## 运行环境要求

- Node.js 16.x 或更高版本
- npm 7.x 或更高版本
- Qdrant向量数据库服务（默认连接到 http://localhost:6333）
- 有效的智谱AI API密钥

## 安装与运行

### 1. 安装依赖

```bash
cd server
npm install
```

### 2. 配置环境变量

创建或编辑`.env`文件，添加必要的配置项，特别是`ZHIPU_API_KEY`。

### 3. 启动Qdrant服务

确保Qdrant向量数据库服务正在运行。您可以使用Docker启动Qdrant：

bash

```bash
docker run -p 6333:6333 -v $(pwd)/qdrant_storage:/qdrant/storage qdrant/qdrant
```

PowerShell

```powershell
docker run -p 6333:6333 -v ${pwd}/qdrant_storage:/qdrant/storage qdrant/qdrant
```

### 4. 运行开发服务器

```bash
npm run dev
```

服务器将在配置的端口（默认为3001）上启动。

### 5. 构建生产版本

```bash
npm run build
```

### 6. 运行生产版本

```bash
npm start
```

## 工作流程

### 1. 知识库构建流程

1. **文件上传**：通过`/api/upload`接口上传PDF或TXT文件
2. **文件解析**：后端解析文件内容
3. **文本分块**：将长文本分割为较小的文本块
4. **文本嵌入**：调用嵌入服务，将文本块转换为向量表示
5. **向量存储**：将向量和文本块元数据存储到Qdrant向量数据库

### 2. 问答流程

1. **接收问题**：通过`/api/chat`或`/api/chat/stream`接口接收用户问题
2. **问题嵌入**：将问题转换为向量表示
3. **相似度搜索**：在向量数据库中搜索相关文档块
4. **构建提示**：将检索结果和问题组合构建提示上下文
5. **生成回答**：调用AI模型生成回答
6. **返回结果**：直接返回回答或通过SSE流式返回

## 错误处理

- **API密钥错误**：如果API密钥无效，系统会返回适当的错误信息
- **文件处理错误**：不支持的文件格式或文件内容问题会返回错误提示
- **向量存储错误**：Qdrant连接失败或存储操作错误会被捕获并处理
- **AI模型错误**：调用AI模型失败会返回友好的错误信息

## 性能优化

- 使用流式响应减少用户等待时间
- 文档分块存储提高检索效率
- 向量索引加速相似度搜索
- 错误重试机制提高系统稳定性

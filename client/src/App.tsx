import { useState } from "react";
import "./App.css";

const API_BASE = "http://localhost:3001";

function App() {
  const [rawText, setRawText] = useState("");
  const [embedStatus, setEmbedStatus] = useState<string>("");
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [streaming, setStreaming] = useState(false);

  const handleEmbed = async () => {
    if (!rawText.trim()) return;
    setEmbedStatus("向量化中...");
    try {
      const resp = await fetch(`${API_BASE}/api/embed`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: rawText }),
      });
      const data = await resp.json();
      if (data.ok) {
        setEmbedStatus(`✅ 已写入向量库，切片数量：${data.chunks}`);
        setRawText(""); // 清空输入框
      } else {
        setEmbedStatus("❌ 失败：" + (data.error || "unknown"));
      }
    } catch (e: any) {
      setEmbedStatus("❌ 错误：" + e.message);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    const isPDF = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isText = file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");

    if (!isPDF && !isText) {
      setUploadStatus("❌ 不支持的文件类型，请上传 PDF 或 TXT 文件");
      return;
    }

    setUploadStatus("📤 正在上传并处理文件...");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const resp = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        body: formData,
      });
      const data = await resp.json();
      if (data.ok) {
        setUploadStatus(`✅ ${data.message || `文件处理成功，生成 ${data.chunks} 个文本片段`}`);
        // 清空文件选择
        event.target.value = "";
      } else {
        setUploadStatus("❌ 失败：" + (data.error || "unknown"));
      }
    } catch (e: any) {
      setUploadStatus("❌ 错误：" + e.message);
    }
  };

  const handleAsk = async () => {
    setAnswer("");
    if (!question.trim()) return;
    setStreaming(true);
    const url = `${API_BASE}/api/chat?question=${encodeURIComponent(
      question
    )}`;
    const evtSource = new EventSource(url);
    evtSource.onmessage = (event) => {
      if (event.data === "[DONE]") {
        evtSource.close();
        setStreaming(false);
        return;
      }
      setAnswer((prev) => prev + event.data);
    };
    evtSource.onerror = () => {
      evtSource.close();
      setStreaming(false);
    };
  };

  return (
    <div className="app">
      <h1>商家知识库 RAG Demo</h1>
      <div className="layout">
        <div className="panel">
          <h2>1. 创建知识文档</h2>
          
          {/* 文件上传方式 */}
          <div style={{ marginBottom: "20px" }}>
            <h3>方式一：上传文件（PDF/TXT）</h3>
            <input
              type="file"
              accept=".pdf,.txt"
              onChange={handleFileUpload}
              style={{ marginBottom: "10px" }}
            />
            <p className="status">{uploadStatus}</p>
          </div>

          {/* 手动输入方式 */}
          <div>
            <h3>方式二：手动输入文本</h3>
          <textarea
              placeholder="在此粘贴或输入商家文档内容..."
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
              style={{ minHeight: "150px" }}
          />
            <button onClick={handleEmbed} disabled={!rawText.trim()}>
              提交到向量库
            </button>
          <p className="status">{embedStatus}</p>
          </div>
        </div>
        <div className="panel">
          <h2>2. 问答（RAG + SSE 流式）</h2>
          <input
            placeholder="请输入要基于知识库提问的问题"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          <button onClick={handleAsk} disabled={streaming}>
            {streaming ? "回答生成中..." : "开始问答"}
          </button>
          <div className="answer-box">
            <pre>{answer}</pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

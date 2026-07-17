# Dify + RAGFlow 富引用配置

本功能保留 Dify 的 SSE 回答，同时由 RAGFlow Proxy 保存检索快照并提供图片、原始文档和 Chunk 详情。Electron 渲染进程只通过 preload/IPC 获取二进制资源，不接触 Dify、RAGFlow 或 Proxy 密钥。

## 1. 数据流

```text
Dify 外部知识库请求
  → RAGFlow Proxy /api/v1/dify/retrieval
  → RAGFlow /api/v1/retrieval
  → Proxy 缓存完整 chunks 并返回 Dify records
  → Dify SSE message_end 返回 retrieval_id / chunk_id
  → Electron 主进程补全引用
  → 引用快照随消息写入本地 JSON
```

## 2. Proxy 配置

代理代码位于 `E:\AIProjects\Proxy`。复制 `.env.example` 为实际环境配置，并至少填写：

```dotenv
RAGFLOW_BASE=http://ragflow:9380
RAGFLOW_API_KEY=ragflow-xxxxxxxxxxxxxxxx
RAGFLOW_NATIVE_RETRIEVAL_PATH=/api/v1/retrieval
PROXY_API_TOKEN=请替换为足够长的随机字符串
```

图片接口在不同 RAGFlow 版本间存在差异。默认配置为：

```dotenv
RAGFLOW_IMAGE_PATH_TEMPLATE=/api/v1/documents/images/{image_id}
RAGFLOW_DOCUMENT_PATH_TEMPLATE=/api/v1/documents/{document_id}
```

旧版本如果使用文档图片路由，可以改成：

```dotenv
RAGFLOW_IMAGE_PATH_TEMPLATE=/v1/document/image/{dataset_id}-{image_id}
```

代理只允许由字母、数字、下划线和短横线组成的资源 ID，不接受任意 URL，因此图片和文档接口不能被用作开放式 SSRF 代理。

构建与运行示例：

```powershell
cd E:\AIProjects\Proxy
docker build -t dify-ragflow-proxy:2.0 .
docker run --rm -p 8008:8008 --env-file .env dify-ragflow-proxy:2.0
```

## 3. Electron 配置

项目 `.env` 增加：

```dotenv
RAGFLOW_PROXY_URL=http://127.0.0.1:8008
RAGFLOW_PROXY_TOKEN=与代理端PROXY_API_TOKEN相同
RAGFLOW_PROXY_TIMEOUT=20000
```

这些变量只由 Electron 主进程读取，没有 `VITE_` 前缀，不会进入渲染进程。

## 4. Dify 外部知识库

保持当前可用的 Proxy 地址。若 Dify 要求填写外部知识库基础地址，通常填写：

```text
http://<proxy-host>:8008/api/v1/dify
```

Dify 最终调用的完整路径应为：

```text
POST /api/v1/dify/retrieval
```

外部知识库 API Key 填写 `PROXY_API_TOKEN`，不要填写真正的 RAGFlow API Key。RAGFlow Key 只保留在代理环境变量中。

## 5. 推荐 Dify System Prompt

```text
你是一个严格基于检索来源回答问题的助手。

规则：
1. 只能依据输入中的 sources 回答，不得使用无法由 sources 支持的事实。
2. 每个 source 的 chunk_id 都是真实标识，禁止修改、编造或推测 chunk_id。
3. 每个事实性结论后使用 [n] 标注引用编号。
4. citations 只能引用本次 sources 中存在的 chunk_id。
5. 找不到依据时明确回答“当前资料中没有足够依据”，不要编造。
6. 不要把自己生成的文档名、页码或分数当成可信数据；这些字段由后端补全。
7. 只输出合法 JSON，不要输出 Markdown 代码围栏或额外解释。

输出格式：
{
  "answer": "回答正文。[1]",
  "citations": [
    {
      "number": 1,
      "chunk_id": "真实 chunk_id",
      "claim": "该引用支持的结论"
    }
  ]
}
```

## 6. 推荐 Dify User Prompt

变量名需要按实际 Chatflow/Workflow 调整：

```text
用户问题：
{{query}}

检索来源：
{{ragflow_sources}}

请严格依据检索来源回答，并按系统要求返回 JSON。
```

每个来源建议整理成：

```xml
<source index="1" chunk_id="chk_001" document="用户手册.pdf" page="12">
系统默认保存 30 天的数据。
</source>
```

推荐让 Workflow 最终输出以下变量：

- `answer`：上述合法 JSON 字符串，或单独的回答正文。
- `citations`：包含 `number`、`chunk_id`、`claim` 的数组。
- `retrieval_id`：代理返回的本次检索标识。

兼容模式下无需立刻修改 Workflow：应用仍会从 Dify `message_end.metadata.retriever_resources` 获取引用；如果 Dify 版本丢弃自定义 metadata，则需要改用 Workflow HTTP 节点显式传回 `retrieval_id`。

## 7. 结构化输出 Schema

```json
{
  "type": "object",
  "required": ["answer", "citations"],
  "properties": {
    "answer": { "type": "string" },
    "citations": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["number", "chunk_id", "claim"],
        "properties": {
          "number": { "type": "integer", "minimum": 1 },
          "chunk_id": { "type": "string", "minLength": 1 },
          "claim": { "type": "string" }
        },
        "additionalProperties": false
      }
    }
  },
  "additionalProperties": false
}
```

## 8. 字段映射

| Citation 字段 | RAGFlow 候选字段 |
| --- | --- |
| `chunkId` | `chunk_id` → `segment_id` → `id` |
| `documentId` | `document_id` → `doc_id` |
| `datasetId` | `dataset_id` → `kb_id` |
| `documentName` | `document_name` → `document_keyword` → `docnm_kwd` → `title` |
| `content` | `content_with_weight` → `content` → `text` → `segment_content` |
| `images` | `image_id` → `img_id` |
| `rawPositions` | `positions` → `position_int` → `bbox` → `bounding_boxes` |
| `score` | `similarity` → `score` |
| `rerankScore` | `rerank_score` |

坐标对象或 0–1 范围坐标会转换为统一 bbox。像素坐标只有在同时获得页面宽高时才会归一化；无法确认坐标系时保留 `rawPositions`，只跳转页码，不绘制错误高亮。

## 9. Proxy API 返回示例

```json
{
  "records": [
    {
      "content": "系统默认保存 30 天的数据。",
      "score": 0.873,
      "title": "用户手册.pdf",
      "metadata": {
        "retrieval_id": "f98a1d0f6d8d4b50a2444f9c0f5d31c2",
        "chunk_id": "chk_001",
        "dataset_id": "dataset_001",
        "document_id": "doc_001",
        "document_name": "用户手册.pdf",
        "image_id": "img_001",
        "positions": [[12, 0.12, 0.88, 0.31, 0.42]]
      }
    }
  ]
}
```

## 10. 测试

Electron 项目：

```powershell
npm test
npm run build
```

代理项目：

```powershell
pip install -r requirements-dev.txt
pytest -q
```

## 11. 已知限制

- 引用缓存当前为进程内 TTL 缓存，适合单实例代理。多实例部署应替换为 Redis。
- 历史消息保存完整文本、页码、图片 ID 和 bbox，但不保存大尺寸图片 Base64。
- 图片接口路径必须与实际 RAGFlow 版本匹配。
- 原始文档查看器会校验响应 MIME、文件扩展名和文件头：PDF 使用兼容 Electron 的 PDF.js 构建；`.doc/.docx`、`.xls/.xlsx`、图片和文本进入各自的预览界面。不能直接预览的格式仍可下载原始文件。
- Dify 若完全丢弃 Proxy 写入的 metadata，需要使用 HTTP 节点显式返回 `retrieval_id`。

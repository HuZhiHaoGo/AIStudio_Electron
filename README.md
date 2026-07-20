# AIStudio Electron（匠宝 Bot）

AIStudio Electron 是一个面向 Windows 的桌面 AI 助手客户端，使用 Electron、React、TypeScript 和 Vite 构建。应用可以同时管理多个 Dify 应用，并通过受控的 Preload/IPC 通道完成流式问答、文件上传、会话管理、反馈标注和 RAGFlow 富引用预览。

本文档面向使用者和项目维护者。Dify 协议适配细节见 [Dify 集成架构](docs/DIFY_INTEGRATION.md)，Dify + RAGFlow 的字段与部署配置见 [富引用配置](docs/dify-ragflow-rich-citations.md)。

## 主要功能

- 管理多个 Dify 助手，并在会话页面快速切换。
- 支持聊天助手、Chatflow、Agent、Workflow 和文本生成应用。
- 保存或刷新助手时同步 Dify 应用名称、模式、输入参数和能力配置。
- 支持 SSE 流式回复、停止生成和重新生成。
- 根据 Dify 能力动态展示输入参数、文件上传和推荐问题。
- 支持本地会话创建、重命名、删除和历史消息保存。
- 支持 Markdown、GFM 表格、代码块、数学公式、Mermaid、图片和附件。
- 支持复制、编辑用户消息、点赞、点踩和 Dify 质量标注。
- 支持 Workflow 运行轨迹和 HITL 人工介入。
- 支持 RAGFlow 富引用卡片、引用编号校验、图片与表格预览。
- 支持查看引用原文；可预览 PDF、Word、Excel、图片和文本文件。
- PDF 支持单页/连续滚动、页码跳转和引用区域定位。

## 技术架构

应用由 Electron 主进程和 React 渲染进程组成。React 不直接访问 Node.js、Dify Key 或 RAGFlow Proxy Token。

```text
用户界面
  ↓
React 渲染进程（src/）
  ↓
前端调用封装（src/services/difyApiClient.ts）
  ↓
Preload 安全桥（electron/preload.ts）
  ↓
IPC 处理器（electron/ipc/）
  ↓
业务服务（electron/services/）
  ├─ Dify API
  ├─ RAGFlow Proxy
  ├─ 本地 JSON 数据
  └─ 下载等系统能力
```

主要边界：

- `src/` 负责界面、状态和用户交互。
- `electron/` 负责窗口、IPC、网络请求、文件读写和系统能力。
- `shared/types/` 定义渲染进程与主进程共享的数据结构。
- Dify API Key 只保存在管理员配置中，传给 React 时会被掩码。
- RAGFlow Token 只由 Electron 主进程读取，不使用 `VITE_` 前缀。

## 环境要求

- Windows 10 或 Windows 11
- Node.js 22
- npm
- Git（推荐）

检查环境：

```powershell
node --version
npm --version
git --version
```

## 快速开始

### 1. 安装依赖

```powershell
npm install
```

Windows 下也可以双击 `setup.bat`。

### 2. 准备环境变量

复制示例文件：

```powershell
Copy-Item .env.example .env
```

如果准备在界面中添加助手，可以暂时保留 Dify 示例值；RAGFlow 富引用不使用时也可以不配置对应代理。

不要提交包含真实密钥的 `.env` 或配置文件。

### 3. 启动开发环境

```powershell
npm run dev
```

该命令会启动 Vite，等待页面可访问后再启动 Electron。也可以双击 `start-dev.bat`。

首次进入“设置”需要通过当前版本的设置校验。开发代码中的默认校验码为 `044909`。该校验只用于限制普通界面操作，不应被视为正式的密钥保护或用户认证方案；对外分发前应改为可配置且安全的认证方式。

### 4. 添加 Dify 助手

进入“设置”，点击“新助手”，填写：

- 名称：可选；留空时读取 Dify 应用名称。
- Dify API 地址：例如 `http://127.0.0.1/v1`。
- API Key：例如 `app-xxxxxxxx`。
- 用户 ID：默认可使用 `desktop-demo-user`。
- 应用类型：聊天助手、Chatflow、Agent、Workflow 或文本生成。

保存时应用会调用 Dify `/parameters` 校验配置，并尝试通过 `/info`、`/site` 同步名称、描述、图标和实际模式。启动后也会自动刷新已配置助手，设置页提供手动“重新同步”。

## 环境变量

项目根目录的 [.env.example](.env.example) 提供了完整模板。

| 变量 | 用途 | 示例/默认值 |
| --- | --- | --- |
| `DIFY_API_BASE_URL` | 首次生成默认助手配置时使用的 Dify API 地址 | `http://你的内网dify地址/v1` |
| `DIFY_API_KEY` | 默认助手 API Key | `app-xxxxxxxx` |
| `DIFY_USER_ID` | 默认 Dify 用户标识 | `desktop-demo-user` |
| `RAGFLOW_PROXY_URL` | Electron 访问 RAGFlow Proxy 的地址 | `http://127.0.0.1:8008` |
| `RAGFLOW_PROXY_TOKEN` | 与 Proxy 的 `PROXY_API_TOKEN` 保持一致 | 无安全默认值 |
| `RAGFLOW_PROXY_TIMEOUT` | Proxy 请求超时，单位毫秒 | `20000` |
| `DATABASE_URL` | Prisma/SQL Server 预留能力 | 见 `.env.example` |

注意：

- 已存在的助手配置以 `app-config.json` 为准，修改 Dify 环境变量不会覆盖已有配置。
- `DATABASE_URL` 对应的 Prisma 能力当前没有接入主要聊天数据流程。
- 打包应用如需覆盖 RAGFlow Proxy 配置，应在启动应用前设置同名 Windows 环境变量，并重启应用及其父进程。

## RAGFlow 富引用

RAGFlow 是可选增强能力。基础 Dify 问答不依赖 Proxy；未配置或代理暂时不可用时，应用会尽量保留 Dify 返回的基础引用，并显示详情加载失败提示。

```text
Dify 外部知识库请求
  → RAGFlow Proxy
  → RAGFlow
  → Proxy 缓存完整检索结果
  → Dify SSE 返回 retrieval_id / chunk_id
  → Electron 补全引用详情
  → 引用快照随消息写入本地数据
```

Proxy 是独立服务，不包含在本仓库中。需要保证：

1. Dify 能访问 Proxy 的外部知识库接口。
2. Electron 能访问 `RAGFLOW_PROXY_URL`。
3. Electron 的 `RAGFLOW_PROXY_TOKEN` 与 Proxy 的 `PROXY_API_TOKEN` 一致。
4. 真正的 RAGFlow API Key 只保存在 Proxy 侧。

详细端点、Prompt、字段映射和排错方法见 [docs/dify-ragflow-rich-citations.md](docs/dify-ragflow-rich-citations.md)。

## 数据与配置位置

| 内容 | 开发环境 | 打包环境 |
| --- | --- | --- |
| 助手配置与 API Key | `config/app-config.json` | Electron `userData/config/app-config.json` |
| 会话、消息、标注和引用快照 | Electron `userData/aistudio-data.json` | Electron `userData/aistudio-data.json` |
| 打包内置配置模板 | 不适用 | `resources/config/app-config.json` |

当前本地数据结构版本为 `schemaVersion: 3`。写入会话数据时不会重复保存助手或 API Key，助手配置由单独的管理员配置文件提供。

如果配置或数据 JSON 无法解析，应用会先把损坏文件重命名为 `.corrupt-时间戳`，再创建可用的新文件。

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `npm run dev` | 同时启动 Vite 和 Electron 开发环境 |
| `npm run dev:vite` | 只启动 Vite |
| `npm run dev:electron` | 编译并启动 Electron，连接本地 Vite |
| `npm run debug:electron` | 以 Node Inspector 模式启动 Electron |
| `npm test` | 执行全部 Vitest 测试 |
| `npm run build` | 类型检查并构建前端和 Electron |
| `npm run start` | 启动已经编译的应用 |
| `npm run pack:dir` | 构建 Windows 绿色目录包 |

`npm run pack:dir` 的结果通常位于：

```text
release/win-unpacked/
```

以下目录由工具生成，不要手动维护：

- `node_modules/`
- `dist/`
- `dist-electron/`
- `release/`

## 项目目录

```text
AIStudio_Electron/
├─ build/                         应用图标等打包资源
├─ config/                        开发配置和打包配置模板
├─ docs/                          Dify 与 RAGFlow 补充文档
├─ electron/                      Electron 主进程
│  ├─ database/                   Prisma/SQL Server 预留能力
│  ├─ ipc/                        IPC 用例处理器
│  ├─ services/
│  │  ├─ dify/                    Dify 请求、能力解析和 SSE 聚合
│  │  └─ ragflow/                 富引用补全、校验和资源客户端
│  ├─ utils/                      ID、时间和文件名工具
│  ├─ window/                     窗口、安全配置和路径管理
│  ├─ main.ts                     Electron 入口
│  └─ preload.ts                  渲染进程安全桥
├─ prisma/                        Prisma 数据模型
├─ scripts/                       启动、等待和打包辅助脚本
├─ shared/types/                  前后端共享类型
├─ src/                           React 渲染进程
│  ├─ components/
│  │  ├─ chat/                    会话、输入和消息操作
│  │  ├─ citations/               富引用卡片和原文查看器
│  │  ├─ layout/                  页面布局组件
│  │  ├─ markdown/                Markdown/KaTeX/Mermaid 渲染
│  │  └─ shared/                  通用对话框等组件
│  ├─ hooks/                      流式状态、滚动和提示逻辑
│  ├─ services/                   前端 IPC 调用封装
│  ├─ utils/                      前端工具函数
│  ├─ App.tsx                     页面状态和主要业务流程
│  └─ main.tsx                    React 入口
├─ .env.example                   环境变量模板
├─ package.json                   依赖、命令和打包配置
├─ tsconfig.json                  前端 TypeScript 配置
├─ vite.config.ts                 Vite 配置
└─ vitest.config.ts               测试配置
```

## 关键调用链

### 保存或刷新助手

```text
src/App.tsx
  → src/services/difyApiClient.ts
  → electron/preload.ts
  → electron/ipc/appHandlers.ts
  → electron/services/adminConfigService.ts
  → electron/services/dify/client.ts
```

### 发送流式消息

```text
src/components/chat/MessageComposer.tsx
  → src/App.tsx
  → electron/ipc/messageHandlers.ts
  → electron/services/dify/client.ts
  → sseParser.ts
  → eventAccumulator.ts
```

### 加载富引用原文

```text
src/components/citations/SourceViewer.tsx
  → src/services/difyApiClient.ts
  → electron/ipc/ragflowHandlers.ts
  → electron/services/ragflow/client.ts
  → RAGFlow Proxy
```

## 测试与验证

运行全部测试：

```powershell
npm test
```

当前仓库包含 18 个测试文件，覆盖：

- Dify 能力解析、SSE 拆包和事件聚合。
- Chatflow、Workflow、HITL、附件和结构化引用。
- RAGFlow 字段适配、引用编号校验和客户端降级行为。
- 历史消息迁移和文件上传类型判断。
- 引用列表、PDF 坐标、查看器尺寸和文档类型识别。
- PDF、Word/Excel 原文查看器及组件交互。
- 消息详情和文本选择复制弹窗。

提交修改前建议执行：

```powershell
npm test
npm run build
git diff --check
```

## 调试与排错

### 页面停在“正在加载界面”

1. 查看启动终端的 Electron/Vite 错误。
2. 按 `Ctrl + Shift + I` 打开开发者工具并检查 Console。
3. 确认 `5173` 端口没有被占用。
4. 执行 `npm run build` 检查 TypeScript 错误。

### Dify 配置保存失败

1. API 地址必须是完整的 `http://` 或 `https://` 地址。
2. 确认 API Key 属于对应 Dify 应用。
3. 确认 `/parameters` 可访问。
4. 检查所选应用类型是否与 Dify 应用一致。

### 富引用详情或原文加载失败

1. 检查 RAGFlow Proxy 健康状态和 Electron 到代理的网络连通性。
2. 确认两侧 Token 一致。
3. 检查引用是否包含 `retrieval_id`、`chunk_id`、数据集和文档标识。
4. 查看 Electron 启动终端中的代理请求错误。
5. 参照 [富引用配置文档](docs/dify-ragflow-rich-citations.md) 检查版本相关路由。

## 开发约定

- UI 不直接拼接 Dify 或 RAGFlow URL，也不直接持有密钥。
- 新增渲染进程能力时，同步维护共享类型、Preload 和对应 IPC handler。
- SSE 解析集中在 `sseParser.ts` 和 `eventAccumulator.ts`，不要在组件中重复解析。
- 修改本地数据结构时保留旧数据兼容，并同步更新 `schemaVersion` 和迁移逻辑。
- 渲染外部 HTML 时继续使用 DOMPurify 等安全处理。
- 不要在日志、截图、测试数据或提交记录中暴露真实 API Key/Token。
- 优先为协议解析、数据迁移和复杂组件交互补充测试。

## 相关文档

- [Dify 集成架构](docs/DIFY_INTEGRATION.md)
- [Dify + RAGFlow 富引用配置](docs/dify-ragflow-rich-citations.md)
- [项目补充指南](docs/PROJECT_GUIDE.md)

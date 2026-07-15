# AIStudio Electron（匠宝 Bot）

这是一个使用 **Electron + React + TypeScript + Vite** 开发的 Windows 桌面 AI 助手客户端，主要用于连接一个或多个 Dify 应用。

本文档同时面向项目维护者和零基础开发者。第一次接触项目时，不建议从第一行代码读到最后一行，请优先阅读“新手阅读与开发顺序”。

## 1. 主要功能

- 管理多个 Dify 助手，并在会话页面快速切换。
- 启动后自动同步 Dify 应用名称、模式、输入参数和能力配置。
- 支持聊天助手、Chatflow、Agent、Workflow 和文本生成应用。
- 支持 Dify SSE 流式回复和停止生成。
- 支持动态输入参数和文件上传。
- 支持本地会话、Dify 远程会话同步、重命名和删除。
- 支持 Markdown、表格、代码块、数学公式、Mermaid、图片和文件附件。
- 支持开场白、初始推荐问题和回答后的推荐追问。
- 支持复制、重新生成、点赞、点踩和质量标注。
- 支持 Workflow 运行轨迹和 HITL 人工介入。
- 支持嵌入翻译 Web 页面。
- 本地保存助手配置、会话、消息和反馈状态。

更详细的 Dify 接入说明见 [docs/DIFY_INTEGRATION.md](docs/DIFY_INTEGRATION.md)。

## 2. 技术架构

这个项目不是普通网页，而是由 React 界面和 Electron 主进程共同组成：

```text
用户操作界面
    ↓
React 渲染进程（src/）
    ↓
前端 API 封装（src/services/difyApiClient.ts）
    ↓
Preload 安全桥（electron/preload.ts）
    ↓
IPC 处理器（electron/ipc/）
    ↓
业务服务（electron/services/）
    ↓
Dify API / 本地 JSON 文件 / 系统能力
```

简单理解：

- `src/`：负责界面长什么样、用户点击后发生什么。
- `electron/`：负责请求 Dify、读写文件、下载附件和创建窗口。
- `shared/types/`：规定助手、会话、消息和 IPC 数据的结构。
- `docs/`：存放补充设计和接入文档。

## 3. 环境准备

建议安装：

- Windows 10 或 Windows 11
- Node.js 22
- npm
- Visual Studio Code
- Git

检查环境：

```powershell
node --version
npm --version
git --version
```

## 4. 安装、运行与构建

### 安装依赖

```powershell
npm install
```

也可以在 Windows 中双击 `setup.bat`。

### 开发运行

```powershell
npm run dev
```

这个命令会启动 Vite 开发服务器，等待页面就绪，然后启动 Electron。

也可以双击 `start-dev.bat`。

### 运行测试

```powershell
npm test
```

### 生产构建

```powershell
npm run build
```

该命令会依次执行：

1. React 和共享代码的 TypeScript 检查。
2. Vite 前端构建。
3. Electron 主进程和 Preload 编译。

### 生成 Windows 绿色版

```powershell
npm run pack:dir
```

构建结果通常位于：

```text
release/win-unpacked/
```

## 5. 助手配置

打开软件后进入“设置”，点击“新助手”，填写：

- Dify API 地址，例如 `http://127.0.0.1/v1`
- API Key，例如 `app-xxxxxxxx`
- 用户 ID
- 应用类型（保存后会根据 Dify 信息自动识别）

名称可以留空，软件会自动读取 Dify 应用名称；如果填写名称，则将其作为本地显示别名。

软件启动后会在后台自动同步所有已配置助手的应用信息。同步成功不会打扰用户，同步失败时会显示失败标记，也可以在设置页面手动点击“重新同步”。

### 配置和数据保存位置

- 开发环境助手配置：`config/app-config.json`
- 打包环境助手配置：Electron `userData/config/app-config.json`
- 会话和消息：Electron `userData/aistudio-data.json`

如果 JSON 文件损坏，程序会先将原文件重命名为 `.corrupt-时间戳`，再创建新文件。

> API Key 属于敏感信息。不要把真实 Key 提交到公开仓库、聊天群或截图中。

## 6. 项目目录

```text
AIStudio_Electron/
├─ build/                     Windows 图标等打包资源
├─ config/                    开发环境助手配置
├─ docs/                      Dify 接入和项目补充文档
├─ electron/                  Electron 主进程代码
│  ├─ database/               Prisma / SQL Server 预留能力
│  ├─ ipc/                    前端请求的 IPC 处理器
│  ├─ services/               本地数据、Dify、下载等服务
│  │  └─ dify/                Dify API、能力和 SSE 解析
│  ├─ utils/                  ID、时间、文件名等工具
│  ├─ window/                 窗口创建和路径管理
│  ├─ main.ts                 Electron 主入口
│  └─ preload.ts              React 与主进程之间的安全桥
├─ prisma/                    Prisma 数据模型
├─ scripts/                   启动和打包辅助脚本
├─ shared/types/              前后端共享类型
├─ src/                       React 前端代码
│  ├─ components/             可复用界面组件
│  ├─ hooks/                  流式消息、滚动、提示等逻辑
│  ├─ services/               前端 API 统一入口
│  ├─ App.tsx                 页面状态和主要业务流程
│  └─ main.tsx                React 入口
├─ package.json               依赖、命令和打包配置
├─ tsconfig.json              前端 TypeScript 配置
├─ vite.config.ts             Vite 配置
└─ vitest.config.ts           单元测试配置
```

以下目录是自动生成的，不要直接修改：

- `node_modules/`
- `dist/`
- `dist-electron/`
- `release/`

## 7. 新手阅读与开发顺序

不要尝试一次读懂整个项目。推荐按照下面的顺序逐层学习。

### 第一步：先运行软件

目标：知道软件当前有哪些页面和功能。

```powershell
npm install
npm run dev
```

依次尝试：

1. 打开设置页面。
2. 查看助手列表。
3. 切换助手。
4. 新建会话。
5. 发送消息。
6. 查看上传、反馈、标注和翻译入口。

此时不用阅读代码，只记录“页面上有什么”。

### 第二步：认识项目使用的语言

建议先了解这些最基础的概念：

1. HTML：页面结构。
2. CSS：颜色、大小、间距和布局。
3. JavaScript：变量、函数、数组、对象和异步。
4. TypeScript：给 JavaScript 数据增加类型说明。
5. React：组件、状态和事件。
6. Electron：主进程、渲染进程、Preload 和 IPC。

不需要全部学完再开发，能看懂基本函数和对象即可继续。

### 第三步：阅读数据说明书

先读：

- `shared/types/app.ts`
- `shared/types/dify.ts`
- `shared/types/ipc.ts`

重点认识：

- `Assistant`：一个 Dify 助手。
- `Conversation`：一个会话。
- `Message`：一条消息。
- `MessageAttachment`：一个附件。
- `DifyCapabilities`：Dify 应用支持的能力。
- `DifyApiBridge`：React 可以调用的 Electron 功能。

可以把 TypeScript 的 `type` 理解成“数据表格的字段说明”。

### 第四步：阅读 React 界面

推荐顺序：

1. `src/main.tsx`：React 如何启动。
2. `src/App.tsx`：主要页面状态和业务函数。
3. `src/components/layout/Sidebar.tsx`：左侧导航。
4. `src/components/chat/AssistantPicker.tsx`：助手选择器。
5. `src/components/chat/MessageComposer.tsx`：输入和上传。
6. `src/components/markdown/MarkdownMessage.tsx`：AI 回答渲染。
7. `src/styles.css`：界面样式。

阅读组件时只回答三个问题：

1. 它接收了哪些参数？
2. 它在页面上显示什么？
3. 点击后调用哪个函数？

### 第五步：理解 React 如何调用 Electron

按照下面的顺序阅读：

```text
src/App.tsx
  ↓
src/services/difyApiClient.ts
  ↓
electron/preload.ts
  ↓
electron/ipc/*.ts
```

这条链路非常重要。例如保存助手：

```text
用户点击“保存助手”
  ↓
App.tsx / saveAssistant()
  ↓
difyApiClient.saveAssistant()
  ↓
window.difyApi.saveAssistant()
  ↓
electron/ipc/appHandlers.ts
  ↓
写入配置文件
```

### 第六步：阅读本地数据管理

阅读：

- `electron/services/adminConfigService.ts`
- `electron/services/appDataService.ts`
- `electron/window/windowPaths.ts`

重点理解：

- 助手配置保存在哪里。
- 会话和消息保存在哪里。
- 为什么前端看不到完整 API Key。
- 开发环境与打包环境路径为什么不同。

### 第七步：最后阅读 Dify 适配层

这是项目中难度最高的部分，建议最后阅读：

1. `electron/services/dify/capabilities.ts`
2. `electron/services/dify/client.ts`
3. `electron/services/dify/sseParser.ts`
4. `electron/services/dify/eventAccumulator.ts`
5. `docs/DIFY_INTEGRATION.md`

简单理解：

- `capabilities.ts`：把 Dify 参数转换成界面能力。
- `client.ts`：向 Dify 发送 HTTP 请求。
- `sseParser.ts`：把流式文本拆成一条条事件。
- `eventAccumulator.ts`：把事件组合成回答、附件、引用和运行轨迹。

### 第八步：从小功能开始修改

适合新手的第一个任务：

- 修改一段提示文字。
- 调整按钮颜色或间距。
- 给按钮增加 `title` 提示。
- 增加一个空状态说明。
- 修改一个对话框标题。

暂时不要把这些作为第一个任务：

- 修改 SSE 解析。
- 修改本地数据结构。
- 重写 IPC。
- 修改 API Key 保存方式。
- 一次重构多个目录。

## 8. 按功能追踪代码

学习项目最快的方法不是逐行阅读，而是追踪“点击之后发生了什么”。

### 新增助手

```text
App.tsx / createAssistantDraft()
  ↓
App.tsx / saveAssistant()
  ↓
difyApiClient.saveAssistant()
  ↓
preload.ts
  ↓
ipc/appHandlers.ts
  ↓
adminConfigService.ts
```

### 发送消息

```text
MessageComposer.tsx
  ↓
App.tsx / sendMessage()
  ↓
difyApiClient.sendMessage()
  ↓
preload.ts
  ↓
ipc/messageHandlers.ts
  ↓
dify/client.ts / runDifyApp()
  ↓
sseParser.ts + eventAccumulator.ts
```

### 上传文件

```text
MessageComposer.tsx
  ↓
App.tsx / chooseFiles()、uploadFile()
  ↓
preload.ts
  ↓
ipc/fileHandlers.ts
  ↓
dify/client.ts / uploadDifyFile()
```

### 会话管理

```text
App.tsx
  ↓
difyApiClient.ts
  ↓
preload.ts
  ↓
ipc/conversationHandlers.ts
  ↓
appDataService.ts / Dify 会话 API
```

### 消息渲染

```text
App.tsx
  ↓
MarkdownMessage.tsx
  ↓
react-markdown / KaTeX / Mermaid
```

## 9. 修改代码的安全流程

建议每次只修改一个小功能：

```text
运行项目并复现问题
  ↓
找到功能入口
  ↓
只修改相关文件
  ↓
在界面上亲自验证
  ↓
npm test
  ↓
npm run build
  ↓
查看 git diff
```

建议使用 Git 分支：

```powershell
git switch -c feature/my-change
git status
git diff
```

不要在不理解后果时使用：

```powershell
git reset --hard
git clean -fd
```

它们可能永久删除尚未提交的代码。

## 10. 常见修改应该去哪里

| 需求 | 优先查看 |
| --- | --- |
| 修改页面布局、颜色、间距 | `src/styles.css`、对应组件 |
| 修改助手选择器 | `src/components/chat/AssistantPicker.tsx` |
| 修改输入框、上传按钮 | `src/components/chat/MessageComposer.tsx` |
| 修改消息展示 | `src/components/markdown/MarkdownMessage.tsx` |
| 修改页面状态或按钮行为 | `src/App.tsx` |
| 增加前端可调用功能 | `shared/types/ipc.ts`、`preload.ts`、`electron/ipc/` |
| 修改 Dify 请求 | `electron/services/dify/client.ts` |
| 修改 SSE 解析 | `sseParser.ts`、`eventAccumulator.ts` |
| 修改本地数据保存 | `appDataService.ts`、`adminConfigService.ts` |
| 修改窗口大小或安全配置 | `electron/window/createWindow.ts` |

## 11. 调试建议

- 开发运行时按 `Ctrl + Shift + I` 打开开发者工具。
- 查看 Console 是否有红色异常。
- React 页面请求可在开发者工具的 Network 中查看；Dify 请求由 Electron 主进程发出，主要查看启动终端和界面错误提示。
- 使用 `console.log()` 时不要打印完整 API Key。
- 界面问题先检查对应组件和 `src/styles.css`。
- IPC 问题从 `difyApiClient → preload → ipc handler` 逐层检查。
- Dify 问题先确认 API 地址、Key、应用类型和 `/parameters` 是否可用。

如果页面停在“正在加载界面”：

1. 查看运行终端是否有报错。
2. 打开开发者工具查看 Console。
3. 确认 Vite 的 `5173` 端口没有被其他程序占用。
4. 执行 `npm run build` 检查类型错误。

## 12. 测试说明

当前测试主要覆盖：

- Dify 能力参数解析。
- SSE 分块、CRLF、多行数据和结束数据解析。

测试文件位于：

- `electron/services/dify/capabilities.test.ts`
- `electron/services/dify/sseParser.test.ts`

新增 Dify 事件或参数类型时，建议同步增加测试。

## 13. 推荐的新手学习记录方式

可以创建自己的 `学习笔记.md`，每理解一个功能就记录一次调用链：

```markdown
## 上传文件

界面入口：MessageComposer.tsx
前端处理：App.tsx / chooseFiles()
IPC：file:upload
主进程：electron/ipc/fileHandlers.ts
Dify 请求：electron/services/dify/client.ts / uploadDifyFile()
```

不需要先完全学会 React 或 Electron再开始。选择一个足够小的真实需求，一边修改、一边记录调用链，是熟悉这个项目最快的方式。

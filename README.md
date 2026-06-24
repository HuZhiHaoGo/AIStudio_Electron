# AIStudio Electron 项目说明

这是一个基于 **Electron + React + TypeScript + Vite** 开发的桌面端 AI 助手客户端。它主要用于连接内网 Dify 应用，在桌面窗口中完成会话聊天、流式回复、文件下载、消息反馈、翻译网页嵌入等功能。

本文档面向零基础开发者，尽量用“这个文件做什么、这个函数做什么”的方式解释项目。

## 一、项目当前功能

### 1. 桌面客户端

- 使用 Electron 创建 Windows 桌面窗口。
- 去掉 Electron 默认菜单栏。
- 支持设置窗口标题和应用图标。
- 开发环境加载 Vite 页面，打包后加载 `dist/index.html`。

### 2. 会话聊天

- 左侧为主导航：会话、翻译。
- 会话页左侧显示助手选择框和会话列表。
- 右侧显示聊天窗口。
- 支持新建会话、删除会话。
- 支持输入问题并发送给 Dify。
- 支持 `Enter` 发送，`Shift + Enter` 换行。
- 支持 Dify streaming 流式输出。
- 请求过程中发送按钮会变为停止按钮，可停止当前生成。

### 3. Markdown 渲染

- 使用 `react-markdown` 渲染 AI 回复。
- 使用 `remark-gfm` 支持表格、列表等 GitHub 风格 Markdown。
- 支持 Dify 返回的文件链接点击下载。

### 4. 文件下载

- 支持识别 Dify 返回的附件。
- 点击附件后弹出系统“另存为”窗口。
- 文件由 Electron Main 进程下载并保存到用户选择的位置。

### 5. 下一轮建议问题

- 从 Dify streaming 事件中记录 `message_id`。
- AI 回复完成后调用 Dify 的建议问题接口。
- 如果 Dify 应用开启了 Suggested Questions，则在 AI 回复下方展示推荐追问。
- 点击推荐问题可直接继续发送。

注意：如果 Dify 返回 `Suggested Questions Is Disabled.`，说明 Dify 应用没有开启建议问题功能，前端不会显示推荐追问。

### 6. 消息点赞 / 点踩

- AI 回复下方显示“有帮助”和“需改进”按钮。
- 调用 Dify `/messages/:message_id/feedbacks` 接口。
- 支持点赞、点踩和再次点击撤销。
- 本地会保存当前消息的反馈状态。

### 7. 翻译网页入口

- 左侧“翻译”按钮会打开翻译平台页面。
- 翻译 Web 地址由管理员在 `config/app-config.json` 中配置。
- 当前项目保留了 `webview` 方式，后续可替换为正式翻译平台。

### 8. 管理员配置

- 助手配置和翻译网页地址不再由普通用户在界面设置。
- 管理员通过 `config/app-config.json` 维护：
  - Dify API 地址
  - Dify API Key
  - 用户 ID
  - 翻译 Web 地址

### 9. 本地数据保存

- 会话和消息保存在 Electron 的 `userData/aistudio-data.json` 中。
- 管理员配置不会写入用户数据文件。
- 前端拿到的 API Key 是脱敏后的，不直接暴露真实 Key。

### 10. SQL Server / Prisma 预留

- 项目已配置 Prisma。
- 数据库连接使用 SQL Server。
- 当前 `electron/db.ts` 提供 Prisma Client、连接检测和断开连接函数。

## 二、常用命令

### 安装依赖

```bash
npm install
```

### 开发启动

```bash
npm run dev
```

作用：

- 启动 Vite React 开发服务器。
- 等 Vite 启动成功后自动启动 Electron。
- 适合二次开发时使用。

### 构建检查

```bash
npm run build
```

作用：

- 检查 React TypeScript 类型。
- 打包前端页面到 `dist`。
- 编译 Electron Main 和 Preload 到 `dist-electron`。

### 打包绿色版

```bash
npm run pack:dir
```

作用：

- 清理旧的绿色版目录。
- 执行完整构建。
- 使用 electron-builder 生成 `release/win-unpacked`。
- 该目录可以直接运行 `AIStudio.exe`。

### Prisma 相关

```bash
npm run prisma:generate
```

根据 `prisma/schema.prisma` 生成 Prisma Client。

```bash
npm run prisma:pull
```

从已存在的数据库反向读取表结构，生成 Prisma 模型。

```bash
npm run prisma:migrate
```

根据 Prisma 模型生成并执行数据库迁移。

## 三、第三方依赖说明

项目依赖主要写在 `package.json` 中，分为两类：

- `dependencies`：程序运行时也需要的依赖。
- `devDependencies`：开发、编译、打包时需要的依赖。

### 1. 运行时依赖 `dependencies`

这些依赖会参与应用功能运行。

| 依赖 | 当前版本 | 在项目中的作用 |
| --- | --- | --- |
| `react` | `^19.0.0` | 前端 UI 框架。`src/main.tsx` 中的组件、状态、事件处理都基于 React。 |
| `react-dom` | `^19.0.0` | 把 React 组件挂载到 `index.html` 的 `<div id="root"></div>` 上。入口在 `src/main.tsx` 的 `createRoot(...)`。 |
| `react-markdown` | `^10.1.0` | 把 AI 回复中的 Markdown 文本渲染成 HTML，例如标题、列表、表格、链接。使用位置：`src/MarkdownMessage.tsx`。 |
| `remark-gfm` | `^4.0.1` | 给 `react-markdown` 增加 GitHub 风格 Markdown 支持，尤其是表格。使用位置：`src/MarkdownMessage.tsx`。 |
| `lucide-react` | `^0.468.0` | 图标库。项目中的会话、翻译、发送、下载、点赞、点踩等图标都来自它。使用位置：`src/main.tsx`。 |
| `dotenv` | `^16.4.7` | 读取 `.env` 文件中的环境变量，例如 Dify 默认配置、数据库连接字符串。使用位置：`electron/main.ts`、`electron/db.ts`。 |
| `prisma` | `^7.8.0` | Prisma 命令行工具，用于 `prisma generate`、`prisma db pull`、`prisma migrate`。虽然放在 `dependencies` 中，但主要用于数据库开发和生成客户端。 |
| `@prisma/client` | `^7.8.0` | Prisma 生成的数据库访问客户端。代码通过它查询或操作数据库。使用位置：`electron/db.ts`。 |
| `@prisma/adapter-mssql` | `^7.8.0` | Prisma 连接 SQL Server 的适配器。当前项目连接 SQL Server 时使用它。使用位置：`electron/db.ts`。 |

简单理解：

- `react` 和 `react-dom`：负责界面。
- `react-markdown` 和 `remark-gfm`：负责 AI 回复格式展示。
- `lucide-react`：负责图标。
- `dotenv`：负责读取配置。
- `prisma`、`@prisma/client`、`@prisma/adapter-mssql`：负责数据库。

### 2. 开发和打包依赖 `devDependencies`

这些依赖主要在开发、编译、打包阶段使用。

| 依赖 | 当前版本 | 在项目中的作用 |
| --- | --- | --- |
| `electron` | `33.4.11` | 桌面应用框架。它让网页技术可以运行成 Windows 桌面程序。使用位置：`electron/main.ts`、`electron/preload.ts`。 |
| `electron-builder` | `^26.15.2` | 打包工具。用于把项目打包成 `release/win-unpacked` 绿色版。命令：`npm run pack:dir`。 |
| `typescript` | `^5.7.0` | TypeScript 编译器。负责把 `.ts`、`.tsx` 代码做类型检查并编译。命令：`npm run build`。 |
| `vite` | `^7.0.0` | 前端开发服务器和构建工具。开发时提供热更新，打包时生成 `dist`。配置文件：`vite.config.ts`。 |
| `@vitejs/plugin-react` | `^5.0.0` | Vite 的 React 插件，让 Vite 能正确处理 React JSX。使用位置：`vite.config.ts`。 |
| `concurrently` | `^9.1.0` | 同时启动多个命令。`npm run dev` 用它同时启动 Vite 和等待脚本。 |
| `cross-env` | `^7.0.3` | 跨平台设置环境变量。Windows、Linux、macOS 设置环境变量的语法不同，它可以统一写法。 |
| `@types/node` | `^22.10.0` | Node.js 类型声明。让 TypeScript 认识 `fs`、`path`、`process` 等 Node API。 |
| `@types/react` | `^19.0.0` | React 类型声明。让 TypeScript 认识 React 组件、Hooks、事件等类型。 |
| `@types/react-dom` | `^19.0.0` | React DOM 类型声明。让 TypeScript 认识 `createRoot` 等 API。 |

简单理解：

- `electron`：让项目变成桌面软件。
- `electron-builder`：负责打包 exe / 绿色版。
- `vite`：负责前端开发和构建。
- `typescript`：负责类型检查。
- `concurrently`：负责同时启动多个开发进程。
- `cross-env`：负责跨平台设置环境变量。
- `@types/...`：给 TypeScript 补充类型说明。

### 3. 重要依赖之间的关系

这个项目不是单纯网页，也不是单纯后端，它由几部分组合起来：

```text
Electron
  负责桌面窗口、文件系统、系统弹窗、下载文件

React
  负责聊天界面、按钮、输入框、消息列表

Vite
  负责开发时启动 React 页面，打包时生成前端静态文件

TypeScript
  负责给 JavaScript 加类型检查，减少低级错误

Dify API
  负责 AI 对话、流式回答、文件返回、消息反馈

Prisma + SQL Server
  预留给后续数据库查询、权限校验、业务数据管理
```

### 4. 为什么有些依赖没有在代码里直接 `import`

有些依赖不是通过代码 `import` 使用，而是通过命令或配置使用。例如：

- `vite`：通过 `npm run dev`、`npm run build` 使用。
- `electron-builder`：通过 `npm run pack:dir` 使用。
- `typescript`：通过 `tsc` 命令使用。
- `concurrently`：通过 `package.json` 的 `dev` 脚本使用。
- `cross-env`：通过 `package.json` 的 `dev:electron`、`pack:dir` 脚本使用。

所以不要只看代码里有没有 `import`，还要看 `package.json` 的命令脚本。

### 5. 依赖文件如何维护

新增依赖：

```bash
npm install 包名
```

新增开发依赖：

```bash
npm install -D 包名
```

卸载依赖：

```bash
npm uninstall 包名
```

安装或卸载依赖后，通常会自动更新：

- `package.json`
- `package-lock.json`
- `node_modules/`

一般不要手动改 `node_modules/`，它是自动安装出来的目录。

## 四、项目目录说明

```text
AIStudio_Electron/
├─ electron/              Electron 主进程和安全桥接代码
├─ src/                   React 前端页面代码
├─ prisma/                Prisma 数据库模型
├─ config/                管理员配置
├─ scripts/               开发和打包辅助脚本
├─ build/                 应用图标等打包资源
├─ docs/                  项目补充文档
├─ dist/                  前端构建产物，自动生成
├─ dist-electron/         Electron 构建产物，自动生成
├─ release/               打包后的绿色版产物，自动生成
├─ package.json           项目依赖、脚本、打包配置
├─ vite.config.ts         Vite 前端构建配置
├─ tsconfig.json          React TypeScript 配置
├─ prisma.config.ts       Prisma 配置
├─ index.html             React 页面入口 HTML
└─ README.md              当前说明文档
```

## 五、核心文件和函数说明

### 1. `package.json`

作用：项目的总配置文件。

主要内容：

- `scripts`：定义 `npm run dev`、`npm run build`、`npm run pack:dir` 等命令。
- `dependencies`：运行时依赖，例如 React、Electron、Prisma、react-markdown。
- `devDependencies`：开发和构建依赖，例如 TypeScript、Vite、electron-builder。
- `main`：Electron 启动入口，当前为 `dist-electron/main.js`。
- `build`：electron-builder 打包配置，包括应用名称、图标、输出目录、额外资源。

### 2. `index.html`

作用：React 页面最开始挂载的 HTML 文件。

关键内容：

- 加载 `src/startup.css`。
- 显示启动等待框。
- 提供 `<div id="root"></div>` 给 React 挂载页面。
- 通过 `<script type="module" src="/src/main.tsx"></script>` 启动 React。

### 3. `vite.config.ts`

作用：Vite 前端构建配置。

内容说明：

- `defineConfig`：Vite 提供的配置辅助函数。
- `react()`：启用 React 插件。
- `base: './'`：保证打包后 Electron 加载本地文件时资源路径正确。
- `server.port: 5173`：开发服务器端口。
- `strictPort: true`：端口被占用时直接报错，不自动换端口。

### 4. `tsconfig.json`

作用：React 前端 TypeScript 编译配置。

它告诉 TypeScript：

- 使用什么语法标准。
- 是否启用严格类型检查。
- 如何识别 React JSX。
- 需要检查哪些文件。

### 5. `electron/tsconfig.json`

作用：Electron Main 和 Preload 的 TypeScript 编译配置。

它和根目录 `tsconfig.json` 分开，是因为：

- React 代码运行在浏览器环境。
- Electron Main 代码运行在 Node.js 环境。
- 两者可用 API 不一样，所以单独配置更清晰。

### 6. `electron/main.ts`

作用：Electron 主进程，是桌面程序真正的“后端”。

它负责：

- 创建桌面窗口。
- 读取管理员配置。
- 读写本地会话数据。
- 调用 Dify 接口。
- 下载文件。
- 停止流式请求。
- 提交消息反馈。
- 把数据通过 IPC 返回给 React。

主要类型：

- `Assistant`：一个 Dify 助手配置。
- `Conversation`：一个聊天会话。
- `Message`：一条聊天消息。
- `MessageAttachment`：消息附件。
- `DifyStreamEvent`：Dify streaming 返回事件。
- `AppData`：应用本地数据总结构。

主要函数：

- `createId()`：生成唯一 ID。
- `now()`：返回当前时间的 ISO 字符串。
- `wait(milliseconds)`：等待一段时间，主要用于建议问题接口重试。
- `dataFilePath()`：获取用户聊天数据文件路径。
- `windowIconPath()`：获取窗口图标路径。
- `adminConfigPath()`：获取管理员配置文件路径。
- `safeFilename(value)`：把文件名中的非法字符替换掉，避免保存失败。
- `maskKey(apiKey)`：隐藏 API Key 的中间部分，避免前端看到真实 Key。
- `publicData(data)`：返回给前端的数据版本，会脱敏 API Key。
- `defaultData()`：生成默认本地数据结构。
- `defaultAdminConfig()`：生成默认管理员配置。
- `normalizeAdminConfig(config)`：补全管理员配置中的缺省字段。
- `readAdminConfig()`：读取 `config/app-config.json`。
- `readData()`：读取用户本地会话和消息，并合并管理员配置。
- `writeData(data)`：保存用户本地会话和消息。
- `createWindow()`：创建 Electron 桌面窗口。
- `sendToDify(...)`：发送用户问题到 Dify，并处理 streaming 返回。
- `fetchSuggestedQuestionsWithRetry(...)`：带重试地获取下一轮建议问题。
- `fetchSuggestedQuestions(...)`：调用 Dify 建议问题接口。
- `sendDifyMessageFeedback(...)`：调用 Dify 点赞/点踩接口。

主要 IPC：

- `app:get-data`：前端读取完整数据。
- `conversation:create`：创建新会话。
- `conversation:delete`：删除会话。
- `file:download`：下载 Dify 返回的文件。
- `message:stop`：停止当前 Dify streaming 请求。
- `message:feedback`：提交点赞/点踩反馈。
- `message:send`：发送消息到 Dify。

程序入口：

- `app.whenReady().then(...)`：Electron 准备好后创建窗口。
- `app.on('window-all-closed', ...)`：窗口全部关闭后退出应用。

### 7. `electron/preload.ts`

作用：安全桥接层。

React 前端不能直接调用 Node.js 或 Electron Main。`preload.ts` 使用 `contextBridge.exposeInMainWorld` 在页面里创建 `window.difyApi`，前端只能通过这些方法访问 Main。

暴露的方法：

- `getData()`：读取本地数据。
- `saveAssistant()`：保存助手配置。当前配置已改为管理员维护，界面不再使用。
- `saveSettings()`：保存设置。当前配置已改为管理员维护，界面不再使用。
- `createConversation(assistantId)`：创建会话。
- `deleteConversation(conversationId)`：删除会话。
- `sendMessage(request)`：发送消息。
- `stopMessage(streamId)`：停止生成。
- `sendMessageFeedback(request)`：提交消息反馈。
- `downloadFile(request)`：下载文件。
- `onMessageStreamChunk(callback)`：监听 Dify streaming 片段。

### 8. `electron/db.ts`

作用：Prisma 数据库入口。

当前数据库类型：SQL Server。

主要函数：

- `databaseUrl()`：读取 `.env` 中的 `DATABASE_URL`。
- `prisma`：全局 Prisma Client 实例。
- `checkDatabaseConnection()`：执行 `SELECT 1` 检查数据库连接。
- `closeDatabaseConnection()`：关闭数据库连接。

### 9. `src/main.tsx`

作用：React 前端主页面。

它负责：

- 渲染左侧导航。
- 渲染会话列表。
- 渲染聊天窗口。
- 处理输入框。
- 展示流式回复。
- 展示附件下载。
- 展示下一轮建议问题。
- 展示点赞/点踩按钮。
- 渲染翻译 Web 页面。

外部辅助函数：

- `formatTime(value)`：把时间格式化成界面显示格式。
- `formatFileSize(size)`：把文件大小格式化成 B、KB、MB。
- `normalizeWebUrl(value)`：补全翻译网页地址。
- `hideStartupWait()`：页面数据加载完成后隐藏启动等待框。

`App()` 内部主要状态：

- `data`：助手、会话、消息、设置的总数据。
- `selectedAssistantId`：当前选中的助手。
- `selectedConversationId`：当前选中的会话。
- `activeView`：当前页面，是会话还是翻译。
- `input`：输入框内容。
- `isSending`：是否正在请求 AI。
- `streamingContent`：正在流式显示的 AI 回复内容。
- `notice` / `error`：界面提示信息。

`App()` 内部主要函数：

- `isNearBottom(element)`：判断聊天区是否接近底部。
- `scrollMessagesToBottom(behavior)`：滚动到聊天底部。
- `setScrollToBottomVisibility(isVisible)`：控制“回到底部”按钮显示。
- `clearStatus()`：清空提示信息。
- `renderStatusBanner()`：渲染提示条。
- `handleMessagesScroll()`：处理聊天区滚动事件。
- `updateMessagesScrollState()`：更新是否贴近底部的状态。
- `loadData()`：从 Main 读取本地数据。
- `saveAssistant()`：保存助手配置。当前界面已隐藏该入口。
- `saveSettings()`：保存翻译 Web 设置。当前界面已隐藏该入口。
- `createAssistantDraft()`：创建助手草稿。当前界面已隐藏该入口。
- `createConversation()`：创建新会话。
- `deleteConversation(conversationId)`：删除会话。
- `downloadFile(url, filename)`：下载附件。
- `stopCurrentMessage()`：停止当前 AI 回复。
- `sendFeedback(message, rating)`：提交点赞或点踩。
- `sendMessage(queryOverride)`：发送用户问题，或发送推荐追问。

### 10. `src/MarkdownMessage.tsx`

作用：封装 Markdown 渲染组件。

主要函数：

- `getTextContent(value)`：从 React 子节点中提取纯文本，用于文件下载时推断文件名。
- `MarkdownMessage(...)`：使用 `ReactMarkdown` 渲染 AI 回复内容。

特殊处理：

- 如果 Markdown 链接中包含 `/files/`，点击时不会打开浏览器。
- 它会调用 `onDownloadFile`，由 Electron Main 弹出“另存为”窗口下载。

### 11. `src/styles.css`

作用：主界面样式文件。

主要负责：

- 应用整体布局。
- 左侧导航栏。
- 会话列表。
- 聊天气泡。
- Markdown 表格和代码块。
- 附件按钮。
- 推荐追问按钮。
- 点赞/点踩按钮。
- 输入框和发送按钮。
- 翻译 Web 页面。

### 12. `src/startup.css`

作用：启动等待框样式。

在 React 数据还没有加载完成前，`index.html` 会先展示“正在加载界面，请稍后...”。当 `loadData()` 完成后，React 调用 `hideStartupWait()` 移除这个等待框。

### 13. `src/vite-env.d.ts`

作用：前端全局类型声明。

它定义了：

- `Assistant`
- `Conversation`
- `Message`
- `MessageAttachment`
- `AppData`
- `Window.difyApi`

为什么 `main.tsx` 能直接使用这些类型？

因为 `.d.ts` 是 TypeScript 的声明文件。只要它被 `tsconfig.json` 包含，项目中的 TS/TSX 文件就能识别其中定义的全局类型。

### 14. `prisma/schema.prisma`

作用：Prisma 数据库模型文件。

当前内容：

- `generator client`：生成 Prisma Client。
- `datasource db`：数据库类型为 `sqlserver`。
- `product_table`：示例数据库表映射。

如果以后数据库表越来越多，通常需要在这里继续增加模型，或者用 `npm run prisma:pull` 从现有数据库反向生成。

### 15. `prisma.config.ts`

作用：Prisma 7 的配置文件。

主要内容：

- 指定 schema 文件位置。
- 从 `.env` 读取 `DATABASE_URL`。
- 指定 migrations 目录。

### 16. `config/app-config.json`

作用：管理员配置文件。

示例：

```json
{
  "assistants": [
    {
      "id": "default-assistant",
      "name": "AI助手",
      "apiBaseUrl": "http://localhost/v1",
      "apiKey": "app-xxxx",
      "userId": "desktop-demo-user",
      "createdAt": "2026-06-22T00:00:00.000Z",
      "updatedAt": "2026-06-22T00:00:00.000Z"
    }
  ],
  "translationWebUrl": "https://example.com"
}
```

说明：

- 普通用户不需要在界面设置助手。
- 管理员改这里即可。
- 打包后该文件会复制到 `resources/config/app-config.json`。

### 17. `scripts/wait-for-vite.cjs`

作用：开发启动辅助脚本。

主要函数：

- `canConnect()`：尝试连接 `127.0.0.1:5173`，判断 Vite 是否启动。
- `waitForVite()`：循环等待 Vite 启动，最多等待 30 秒。

启动流程：

```text
npm run dev
  ↓
启动 Vite
  ↓
wait-for-vite 等待 5173 端口可连接
  ↓
启动 Electron
```

### 18. `scripts/clean-release.cjs`

作用：打包前清理旧产物。

主要函数：

- `removeTarget(name)`：删除 `release/win-unpacked` 和 `release/win-unpacked.tmp`。

### 19. `build/app-icon.ico`

作用：Windows 应用和窗口图标。

它在 `package.json` 的 `build.win.icon` 中被使用。

### 20. `src/LOGO/`

作用：存放前端界面使用的 logo 图片。

当前 `src/main.tsx` 使用：

```ts
import tbeaLogo from './LOGO/TBEA3.png';
```

### 21. `.env` 和 `.env.example`

`.env.example` 是示例配置，适合提交到代码仓库。

`.env` 是本机真实配置，一般不要提交。

当前常见字段：

```env
DIFY_API_BASE_URL=http://你的内网dify地址/v1
DIFY_API_KEY=app-xxxxxxxxxxxxxxxx
DIFY_USER_ID=desktop-demo-user
DATABASE_URL="sqlserver://localhost:1433;database=aistudio;user=sa;password=your_password;trustServerCertificate=true"
```

### 22. `setup.bat`

作用：Windows 下双击安装依赖。

本质上通常等价于执行：

```bash
npm install
```

### 23. `start-dev.bat`

作用：Windows 下双击开发启动。

本质上通常等价于执行：

```bash
npm run dev
```

### 24. `pack-dir.bat`

作用：Windows 下双击打包绿色版。

本质上通常等价于执行：

```bash
npm run pack:dir
```

### 25. `package-lock.json`

作用：锁定依赖的精确版本。

你执行 `npm install` 时，npm 会根据 `package.json` 和 `package-lock.json` 安装依赖。这个文件可以保证不同电脑安装出来的依赖版本尽量一致。

一般不手动修改它。安装、卸载、升级依赖时它会自动变化。

### 26. `.gitignore`

作用：告诉 Git 哪些文件不要提交。

通常会忽略：

- `node_modules/`
- `dist/`
- `dist-electron/`
- `release/`
- `.env`

### 27. `docs/PROJECT_GUIDE.md`

作用：项目补充说明文档。

如果 README 是总说明，那么 `docs/PROJECT_GUIDE.md` 可以放更细的开发记录、二次开发说明或业务设计文档。

### 28. `.vscode/`

作用：VS Code 编辑器配置目录。

它可能包含编辑器推荐设置、调试配置等。不是程序运行必需文件。

### 29. `dist/`、`dist-electron/`、`release/`

这些是构建或打包后生成的目录。

- `dist/`：React 前端构建产物。
- `dist-electron/`：Electron Main 和 Preload 编译产物。
- `release/`：electron-builder 打包输出目录。

它们不是源码，通常不需要手动修改。

## 六、核心数据流

### 1. 启动流程

```text
用户运行 npm run dev
  ↓
Vite 启动 React 页面
  ↓
wait-for-vite 检查 Vite 是否就绪
  ↓
Electron Main 创建桌面窗口
  ↓
Preload 注入 window.difyApi
  ↓
React 调用 window.difyApi.getData()
  ↓
Main 读取 config/app-config.json 和本地 aistudio-data.json
  ↓
界面展示助手、会话和消息
```

### 2. 发送消息流程

```text
用户输入问题并发送
  ↓
React 调用 window.difyApi.sendMessage()
  ↓
Preload 转发给 Electron Main
  ↓
Main 保存用户消息
  ↓
Main 调用 Dify /chat-messages
  ↓
Dify streaming 返回片段
  ↓
Main 通过 message:stream-chunk 发给 React
  ↓
React 实时显示 AI 回复
  ↓
Main 保存完整 AI 回复
  ↓
React 刷新会话数据
```

### 3. 文件下载流程

```text
Dify 返回文件链接
  ↓
React 显示附件按钮
  ↓
用户点击下载
  ↓
React 调用 window.difyApi.downloadFile()
  ↓
Main 弹出系统另存为窗口
  ↓
Main 下载文件并保存
```

### 4. 消息反馈流程

```text
用户点击有帮助 / 需改进
  ↓
React 调用 window.difyApi.sendMessageFeedback()
  ↓
Main 调用 Dify /messages/:message_id/feedbacks
  ↓
Dify 返回 success
  ↓
Main 保存本地反馈状态
  ↓
React 高亮对应按钮
```

## 七、哪些文件不建议手动修改

这些目录或文件通常是自动生成的：

- `node_modules/`
- `dist/`
- `dist-electron/`
- `release/`
- `package-lock.json`，除非你执行了 `npm install`

开发时主要修改：

- `src/`
- `electron/`
- `config/app-config.json`
- `prisma/schema.prisma`
- `README.md`

## 八、二次开发建议

如果你刚开始学习，建议按这个顺序看代码：

1. 先看 `package.json`，理解有哪些命令。
2. 再看 `index.html`，理解 React 页面挂载点。
3. 看 `src/main.tsx`，理解界面长什么样。
4. 看 `electron/preload.ts`，理解前端如何调用后端能力。
5. 看 `electron/main.ts`，理解本地数据和 Dify 请求。
6. 看 `src/MarkdownMessage.tsx`，理解 Markdown 和文件下载。
7. 最后看 `electron/db.ts` 和 `prisma/schema.prisma`。

建议每次改动后执行：

```bash
npm run build
```

如果构建成功，说明 TypeScript 和打包流程基本没有问题。

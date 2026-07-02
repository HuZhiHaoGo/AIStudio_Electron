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
| `react-markdown` | `^10.1.0` | 把 AI 回复中的 Markdown 文本渲染成 HTML，例如标题、列表、表格、链接。使用位置：`src/components/markdown/MarkdownMessage.tsx`。 |
| `remark-gfm` | `^4.0.1` | 给 `react-markdown` 增加 GitHub 风格 Markdown 支持，尤其是表格。使用位置：`src/components/markdown/MarkdownMessage.tsx`。 |
| `lucide-react` | `^0.468.0` | 图标库。项目中的会话、翻译、发送、下载、点赞、点踩等图标都来自它。使用位置：`src/components/` 和 `src/App.tsx`。 |
| `dotenv` | `^16.4.7` | 读取 `.env` 文件中的环境变量，例如 Dify 默认配置、数据库连接字符串。使用位置：`electron/main.ts`、`electron/database/prismaClient.ts`。 |
| `prisma` | `^7.8.0` | Prisma 命令行工具，用于 `prisma generate`、`prisma db pull`、`prisma migrate`。虽然放在 `dependencies` 中，但主要用于数据库开发和生成客户端。 |
| `@prisma/client` | `^7.8.0` | Prisma 生成的数据库访问客户端。代码通过它查询或操作数据库。使用位置：`electron/database/prismaClient.ts`。 |
| `@prisma/adapter-mssql` | `^7.8.0` | Prisma 连接 SQL Server 的适配器。当前项目连接 SQL Server 时使用它。使用位置：`electron/database/prismaClient.ts`。 |

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

## 四、项目目录和文件说明

这一节相当于项目地图。你可以先不用理解每一行代码，但需要知道“文件大概归谁管、改哪里会影响什么”。

### 1. 根目录总览

```text
AIStudio_Electron/
├─ .agents/               AI 编程助手相关的本地配置目录，当前为空
├─ .git/                  Git 版本库目录，记录代码历史，不手动修改
├─ .vscode/               VS Code 调试和任务配置
├─ build/                 打包资源，例如应用 ico 图标
├─ config/                管理员配置，例如助手和翻译网页地址
├─ dist/                  React 前端构建产物，自动生成
├─ dist-electron/         Electron Main/Preload 编译产物，自动生成
├─ docs/                  项目补充文档
├─ electron/              Electron 主进程、IPC、服务层、数据库层
├─ node_modules/          npm 安装出来的第三方依赖，自动生成
├─ prisma/                Prisma 数据库模型
├─ release/               electron-builder 打包产物，自动生成
├─ scripts/               开发和打包辅助脚本
├─ shared/                Electron 和 React 共享 TypeScript 类型
├─ src/                   React 前端界面代码
├─ .env                   本机真实环境变量，通常不提交
├─ .env.example           环境变量示例文件，可以提交
├─ .gitignore             Git 忽略规则
├─ index.html             React 页面入口 HTML
├─ pack-dir.bat           Windows 双击打包绿色版脚本
├─ package-lock.json      npm 依赖精确版本锁定文件
├─ package.json           项目依赖、命令、Electron 打包配置
├─ prisma.config.ts       Prisma 7 配置文件
├─ setup.bat              Windows 双击安装依赖脚本
├─ start-dev.bat          Windows 双击开发启动脚本
├─ tsconfig.json          React/共享类型的 TypeScript 配置
├─ vite.config.ts         Vite 前端开发和构建配置
└─ README.md              当前项目说明文档
```

### 2. 隐藏目录和编辑器配置

#### `.agents/`

作用：AI 编程助手相关的本地配置目录。

当前状态：目录存在，但目前没有文件。

说明：

- 不是项目运行必需目录。
- 如果以后使用某些 AI Agent 工具，它可能在这里保存任务、配置或上下文。
- 不建议放业务代码。

#### `.git/`

作用：Git 版本控制系统自动生成的目录。

说明：

- 记录提交历史、分支、暂存区等信息。
- 不要手动修改里面的文件。
- 如果删除 `.git/`，项目代码还在，但会丢失 Git 版本历史。

#### `.vscode/`

作用：VS Code 编辑器相关配置。

包含文件：

| 文件 | 作用 |
| --- | --- |
| `.vscode/launch.json` | VS Code 调试配置，用于启动 Electron Main 调试。 |
| `.vscode/tasks.json` | VS Code 任务配置，例如启动 Vite 开发服务器、编译 Electron。 |

注意：

- 这些文件只影响 VS Code 的调试体验。
- 不影响 `npm run dev`、`npm run build` 的正常执行。
- 当前 Electron 实际入口以 `package.json` 的 `main` 字段为准：`dist-electron/electron/main.js`。

### 3. Electron 后端目录 `electron/`

`electron/` 可以理解为这个桌面软件的“后端”。它运行在 Electron Main 进程里，能访问本地文件、系统弹窗、数据库、Dify 接口等能力。

```text
electron/
├─ database/              Prisma 和数据库连接相关
├─ ipc/                   前端和 Main 进程通信的处理入口
├─ services/              业务服务层
├─ utils/                 通用工具函数
├─ window/                窗口创建和路径管理
├─ db.ts                  数据库能力兼容导出口
├─ main.ts                Electron Main 主入口
├─ preload.ts             安全桥接层，向 React 暴露 window.difyApi
└─ tsconfig.json          Electron TypeScript 编译配置
```

#### `electron/main.ts`

作用：Electron 主进程入口。

主要负责：

- 加载 `.env`。
- 设置 Electron 启动参数。
- 注册 IPC 处理方法。
- 创建主窗口。
- 处理应用生命周期，例如窗口全部关闭后退出。

它现在更像“总开关”，具体业务已经拆到 `ipc/` 和 `services/`。

#### `electron/preload.ts`

作用：React 前端和 Electron Main 的安全桥。

它通过 `contextBridge.exposeInMainWorld('difyApi', {...})` 创建 `window.difyApi`，让 React 可以调用：

- `getData()`
- `createConversation()`
- `deleteConversation()`
- `sendMessage()`
- `stopMessage()`
- `sendMessageFeedback()`
- `downloadFile()`
- `onMessageStreamChunk()`

前端不能直接访问 `fs`、`path`、数据库等 Node 能力，必须通过 preload 转发给 Main。

#### `electron/tsconfig.json`

作用：Electron 代码的 TypeScript 编译配置。

为什么单独有一个：

- `src/` 里的 React 代码运行在浏览器环境。
- `electron/` 里的 Main 代码运行在 Node/Electron 环境。
- 两边可用 API 不一样，所以分开配置更清楚。

#### `electron/db.ts`

作用：数据库兼容导出口。

当前它把 `electron/database/` 里的能力统一导出，方便其他代码引用：

- `prisma`
- `checkDatabaseConnection`
- `closeDatabaseConnection`

后续更推荐业务代码通过 repository/service 访问数据库，而不是到处直接调用 Prisma。

### 4. Electron 窗口目录 `electron/window/`

```text
electron/window/
├─ createWindow.ts        创建 BrowserWindow 并加载前端页面
└─ windowPaths.ts         管理图标、数据文件、管理员配置等路径
```

#### `createWindow.ts`

作用：创建桌面窗口。

主要负责：

- 设置窗口大小、标题、图标。
- 指定 preload 文件。
- 开发环境加载 Vite 地址。
- 打包环境加载 `dist/index.html`。
- 处理 `Ctrl + Shift + I` 打开 DevTools。
- 拦截外部链接，避免在应用内部乱跳。

#### `windowPaths.ts`

作用：集中管理路径。

主要包括：

- `dataFilePath()`：用户本地数据文件路径。
- `windowIconPath()`：窗口图标路径。
- `adminConfigPath()`：管理员配置文件路径。

集中管理路径的好处是，开发环境和打包环境路径不同，但业务代码不用到处判断。

### 5. Electron IPC 目录 `electron/ipc/`

IPC 是 Inter-Process Communication，意思是“进程间通信”。React 页面和 Electron Main 是两个不同环境，它们通过 IPC 通信。

```text
electron/ipc/
├─ appHandlers.ts             应用数据相关 IPC
├─ conversationHandlers.ts    会话相关 IPC
├─ fileHandlers.ts            文件下载相关 IPC
├─ messageHandlers.ts         消息发送、停止、反馈相关 IPC
└─ registerIpcHandlers.ts     统一注册所有 IPC
```

#### `registerIpcHandlers.ts`

作用：统一注册 IPC。

`main.ts` 只需要调用 `registerIpcHandlers()`，不用关心每一个具体接口如何注册。

#### `appHandlers.ts`

作用：处理应用初始化数据。

主要处理：

- `app:get-data`：读取助手、会话、消息、设置等数据。

#### `conversationHandlers.ts`

作用：处理会话。

主要处理：

- `conversation:create`：创建新会话。
- `conversation:delete`：删除会话和对应消息。

#### `messageHandlers.ts`

作用：处理消息。

主要处理：

- `message:send`：发送用户消息到 Dify。
- `message:stop`：停止当前 streaming 回复。
- `message:feedback`：提交点赞、点踩、撤销反馈。

#### `fileHandlers.ts`

作用：处理文件下载。

主要处理：

- `file:download`：弹出系统另存为窗口，下载 Dify 返回的文件。

### 6. Electron 服务层 `electron/services/`

服务层是真正做业务事情的地方。IPC 只负责接请求，服务层负责处理逻辑。

```text
electron/services/
├─ adminConfigService.ts      管理员配置读取和规范化
├─ appDataService.ts          本地数据读写
├─ difyService.ts             Dify API、streaming、建议问题、反馈
└─ downloadService.ts         文件下载和另存为
```

#### `adminConfigService.ts`

作用：读取管理员配置。

主要负责：

- 读取 `config/app-config.json`。
- 提供默认配置。
- 规范化助手字段。
- 保证前端拿到的数据结构稳定。

#### `appDataService.ts`

作用：读写用户本地数据。

主要负责：

- 读取 `aistudio-data.json`。
- 第一次启动时创建默认数据。
- 保存会话、消息、附件、反馈状态。
- 合并管理员配置。
- 返回脱敏后的公开数据，避免把真实 API Key 暴露给前端。

#### `difyService.ts`

作用：和 Dify 通信。

主要负责：

- 调用 Dify `/chat-messages`。
- 解析 Dify streaming 返回。
- 收集 Dify 返回的 `message_id`、answer、files。
- 请求下一轮建议问题。
- 调用 Dify 消息反馈接口。
- 处理停止生成。

#### `downloadService.ts`

作用：下载文件。

主要负责：

- 打开系统“另存为”窗口。
- 根据 Dify 返回的相对地址或完整地址拼出下载 URL。
- 下载文件内容。
- 保存到用户选择的位置。

### 7. Electron 数据库目录 `electron/database/`

```text
electron/database/
├─ health.ts             数据库连接检查和断开
└─ prismaClient.ts       Prisma Client 创建
```

#### `prismaClient.ts`

作用：创建 Prisma Client。

当前项目使用：

- Prisma
- SQL Server
- `@prisma/adapter-mssql`
- `.env` 里的 `DATABASE_URL`

#### `health.ts`

作用：数据库健康检查。

主要提供：

- `checkDatabaseConnection()`：检查数据库能不能连通。
- `closeDatabaseConnection()`：关闭 Prisma 数据库连接。

### 8. Electron 工具目录 `electron/utils/`

```text
electron/utils/
├─ filename.ts           文件名处理
├─ id.ts                 ID 生成
└─ time.ts               时间格式化
```

#### `filename.ts`

作用：处理下载文件名。

常见用途：

- 从 URL 或附件信息里推断文件名。
- 避免保存文件时没有合适名称。

#### `id.ts`

作用：生成唯一 ID。

会话、消息、stream 请求等需要唯一标识时使用。

#### `time.ts`

作用：时间格式化。

用于会话列表和消息展示，例如 `06/24 09:12`。

### 9. React 前端目录 `src/`

`src/` 是用户真正看到的界面。它运行在 Electron 窗口中的网页环境里。

```text
src/
├─ components/           React UI 组件
├─ hooks/                React 自定义 Hooks
├─ LOGO/                 前端界面使用的 logo 图片
├─ services/             前端 API 封装
├─ App.tsx               主界面组件
├─ main.tsx              React 入口
├─ startup.css           启动等待框样式
├─ styles.css            主界面样式
└─ vite-env.d.ts         前端全局类型声明
```

#### `src/main.tsx`

作用：React 入口。

它负责把 `<App />` 挂载到 `index.html` 的 `<div id="root"></div>` 上。

#### `src/App.tsx`

作用：前端主页面。

主要负责：

- 保存当前页面状态。
- 加载本地数据。
- 管理当前助手、当前会话。
- 发送消息。
- 停止生成。
- 下载附件。
- 提交反馈。
- 切换会话/翻译页面。
- 组合各个组件显示完整界面。

#### `src/styles.css`

作用：主样式文件。

负责：

- 整体布局。
- 左侧导航栏。
- 会话列表。
- 聊天区域。
- Markdown 表格。
- 附件。
- 推荐问题。
- 点赞/点踩。
- 输入框。
- 翻译页面。

如果以后样式越来越多，可以拆成：

```text
src/styles/
├─ variables.css
├─ layout.css
├─ sidebar.css
├─ chat.css
├─ markdown.css
└─ forms.css
```

#### `src/startup.css`

作用：启动等待框样式。

在 React 数据没加载完成前，`index.html` 会先显示加载提示。加载完成后，React 会隐藏这个等待框。

#### `src/vite-env.d.ts`

作用：前端全局类型声明。

主要声明：

- `window.difyApi`
- Electron `webview` 标签

否则 TypeScript 会不知道这些全局对象是什么。

### 10. React 组件目录 `src/components/`

```text
src/components/
├─ chat/                 聊天相关组件
├─ layout/               页面布局组件
├─ markdown/             Markdown 渲染组件
└─ translate/            翻译网页组件
```

#### `src/components/layout/Sidebar.tsx`

作用：左侧导航栏。

负责显示：

- 顶部 logo。
- 会话按钮。
- 翻译按钮。

#### `src/components/layout/StatusBanner.tsx`

作用：顶部或页面中的状态提示条。

用于显示：

- 保存成功。
- 下载成功。
- 请求失败。
- 反馈提交失败等。

#### `src/components/chat/MessageAttachments.tsx`

作用：消息附件展示。

如果 Dify 返回文件，例如 Excel、Word、CAD 结果文件，这个组件负责显示下载入口。

#### `src/components/chat/MessageComposer.tsx`

作用：底部输入框。

负责：

- 输入问题。
- `Enter` 发送。
- `Shift + Enter` 换行。
- 发送按钮。
- 请求过程中显示停止按钮。

#### `src/components/chat/MessageFeedback.tsx`

作用：AI 消息点赞/点踩。

负责：

- 有帮助。
- 需改进。
- 再次点击撤销。
- 调用前端反馈逻辑。

#### `src/components/chat/SuggestedQuestions.tsx`

作用：下一轮建议问题。

AI 回复完成后，如果 Dify 返回建议问题，这个组件负责把它们展示成可点击按钮。

#### `src/components/markdown/MarkdownMessage.tsx`

作用：Markdown 渲染。

负责使用：

- `react-markdown`
- `remark-gfm`

让 AI 回复中的标题、表格、列表、链接正确显示。

#### `src/components/translate/TranslateWorkspace.tsx`

作用：翻译网页区域。

它读取管理员配置里的 `translationWebUrl`，并在右侧打开对应 Web 页面。后续如果要接正式翻译平台，可以从这里继续扩展。

### 11. React Hooks 目录 `src/hooks/`

Hooks 是 React 里抽取状态逻辑的一种方式。

```text
src/hooks/
├─ useMessageStreaming.ts    监听 Dify streaming
├─ useScrollToBottom.ts      聊天滚动控制
└─ useStatusMessage.ts       提示消息控制
```

#### `useMessageStreaming.ts`

作用：处理流式回复。

负责：

- 监听 Main 进程发来的 `message:stream-chunk`。
- 动态显示正在请求的点点点。
- 更新 AI 临时回复内容。
- 接收完成、错误、停止状态。

#### `useScrollToBottom.ts`

作用：处理聊天滚动。

负责：

- 新消息到来时滚动到底部。
- 判断用户是否离开底部。
- 控制是否显示“回到底部”按钮。

#### `useStatusMessage.ts`

作用：处理提示消息。

负责：

- 显示成功/失败提示。
- 自动关闭提示。
- 手动关闭提示。

### 12. 前端服务目录 `src/services/`

```text
src/services/
└─ difyApiClient.ts      前端调用 window.difyApi 的封装
```

#### `difyApiClient.ts`

作用：前端 API client。

它封装了 `window.difyApi`，让组件不要直接到处写 `window.difyApi.xxx()`。

好处：

- 调用入口统一。
- 后续如果改成 HTTP 后端，只需要优先改这里。
- 组件代码更干净。

### 13. 前端资源目录 `src/LOGO/`

```text
src/LOGO/
├─ botImg.png
├─ TBEA1.png
├─ TBEA2.png
└─ TBEA3.png
```

作用：存放前端界面用到的图片。

当前侧边栏 logo 主要使用 `TBEA3.png`。如果要替换界面 logo，可以优先看 `src/components/layout/Sidebar.tsx` 中的图片引用。

### 14. 共享类型目录 `shared/`

```text
shared/
└─ types/
   ├─ app.ts             应用业务类型
   ├─ dify.ts            Dify 返回数据类型
   └─ ipc.ts             IPC 请求、响应、桥接 API 类型
```

#### `shared/types/app.ts`

作用：定义项目核心业务数据类型。

例如：

- `Assistant`
- `Conversation`
- `Message`
- `MessageAttachment`
- `AppData`

#### `shared/types/dify.ts`

作用：定义 Dify 相关类型。

例如：

- Dify streaming event。
- Dify 返回文件。
- Dify 建议问题。

#### `shared/types/ipc.ts`

作用：定义前端和 Electron Main 通信的数据类型。

例如：

- `SendMessageRequest`
- `DownloadFileRequest`
- `MessageFeedbackRequest`
- `DifyApiBridge`

### 15. Prisma 目录 `prisma/`

```text
prisma/
└─ schema.prisma         数据库模型文件
```

#### `prisma/schema.prisma`

作用：定义数据库结构和 Prisma Client 生成规则。

当前项目使用 SQL Server。

里面通常包含：

- `generator client`：生成 Prisma Client。
- `datasource db`：数据库连接类型。
- `model xxx`：数据库表映射。

如果以后表越来越多，一般需要：

- 手动在 `schema.prisma` 中新增 model。
- 或使用 `npm run prisma:pull` 从已有数据库反向生成 model。

### 16. 配置目录 `config/`

```text
config/
└─ app-config.json       管理员维护的应用配置
```

#### `config/app-config.json`

作用：管理员配置文件。

主要配置：

- 助手列表。
- Dify API 地址。
- Dify API Key。
- Dify 用户 ID。
- 翻译 Web 地址。

普通用户不需要在界面里配置这些内容。管理员改这个文件即可。

打包时，`package.json` 的 `build.extraResources` 会把 `config/` 复制到应用资源目录。

### 17. 构建资源目录 `build/`

```text
build/
└─ app-icon.ico          Windows 应用图标
```

#### `build/app-icon.ico`

作用：

- Windows exe 图标。
- Electron 窗口图标。
- 打包时由 `package.json` 的 `build.win.icon` 使用。

如果要修改 exe 应用图标，通常替换这个文件后重新打包。

### 18. 脚本目录 `scripts/`

```text
scripts/
├─ clean-release.cjs     清理旧打包产物
└─ wait-for-vite.cjs     等待 Vite 启动后再启动 Electron
```

#### `scripts/wait-for-vite.cjs`

作用：开发启动辅助脚本。

流程：

```text
npm run dev
  ↓
启动 Vite
  ↓
wait-for-vite 检测 127.0.0.1:5173 是否可访问
  ↓
Vite 就绪后启动 Electron
```

它解决的问题是：Electron 不能太早打开，否则页面还没启动好，窗口可能白屏或加载失败。

#### `scripts/clean-release.cjs`

作用：打包前清理旧的绿色版目录。

主要清理：

- `release/win-unpacked`
- `release/win-unpacked.tmp`

避免旧文件影响新打包结果。

### 19. 文档目录 `docs/`

```text
docs/
└─ PROJECT_GUIDE.md      项目补充说明
```

#### `docs/PROJECT_GUIDE.md`

作用：项目补充文档。

README 是总说明，`PROJECT_GUIDE.md` 可以放更细的开发记录、二次开发说明、业务流程设计等内容。

### 20. 自动生成目录

这些目录不是你主要写代码的地方。

#### `node_modules/`

作用：npm 安装出来的第三方依赖。

说明：

- 执行 `npm install` 后生成。
- 不要手动修改。
- 不需要提交到 Git。

#### `dist/`

作用：React 前端构建产物。

生成命令：

```bash
npm run build
```

打包后 Electron 会加载这里的 `index.html`。

#### `dist-electron/`

作用：Electron Main 和 Preload 编译产物。

生成命令：

```bash
npm run build
```

或：

```bash
npm run compile:electron
```

当前 Electron 实际启动入口：

```text
dist-electron/electron/main.js
```

#### `release/`

作用：绿色版或安装包输出目录。

生成命令：

```bash
npm run pack:dir
```

绿色版通常在：

```text
release/win-unpacked/
```

### 21. 根目录配置文件和脚本

#### `package.json`

作用：项目总配置。

包含：

- 项目名称和版本。
- npm scripts。
- 第三方依赖。
- Electron 入口。
- electron-builder 打包配置。

#### `package-lock.json`

作用：锁定依赖精确版本。

说明：

- `npm install` 会读取和更新它。
- 保证不同电脑安装出来的依赖尽量一致。
- 一般不手动修改。

#### `index.html`

作用：前端 HTML 入口。

它提供：

- 启动等待框。
- `<div id="root"></div>` 给 React 挂载。
- `<script type="module" src="/src/main.tsx"></script>` 启动前端代码。

#### `vite.config.ts`

作用：Vite 配置文件。

主要配置：

- React 插件。
- 开发端口 `5173`。
- `base: './'`，保证 Electron 打包后能正确加载本地资源。

#### `tsconfig.json`

作用：根 TypeScript 配置。

主要用于：

- React 前端。
- `shared/` 共享类型。
- 类型检查。

#### `prisma.config.ts`

作用：Prisma 7 配置文件。

主要指定：

- `schema.prisma` 的位置。
- 迁移目录。
- 从 `.env` 加载数据库连接字符串。

#### `.env`

作用：本机真实环境变量。

常见内容：

```env
DIFY_API_BASE_URL=http://你的内网dify地址/v1
DIFY_API_KEY=app-xxxxxxxx
DIFY_USER_ID=desktop-demo-user
DATABASE_URL="sqlserver://localhost:1433;database=aistudio;user=sa;password=your_password;trustServerCertificate=true"
```

注意：

- 里面可能有真实密钥和数据库密码。
- 一般不要提交到 Git。

#### `.env.example`

作用：环境变量模板。

给其他开发者参考需要配置哪些字段，但不放真实密码和真实 Key。

#### `.gitignore`

作用：Git 忽略规则。

通常忽略：

- `node_modules/`
- `dist/`
- `dist-electron/`
- `release/`
- `.env`

#### `setup.bat`

作用：Windows 双击安装依赖。

它主要执行：

```bash
npm install
```

同时设置 Electron 下载镜像，方便国内网络环境安装 Electron。

#### `start-dev.bat`

作用：Windows 双击启动开发环境。

它主要执行：

```bash
npm run dev
```

适合不会频繁敲命令时使用。

#### `pack-dir.bat`

作用：Windows 双击打包绿色版。

它主要执行：

```bash
npm run pack:dir
```

并设置 Electron 和 electron-builder 的下载镜像。

打包成功后，到下面目录运行：

```text
release/win-unpacked/AIStudio.exe
```

#### `README.md`

作用：项目说明文档，也就是当前文件。

建议把：

- 项目功能。
- 启动命令。
- 目录结构。
- 二次开发说明。
- 常见问题。

都持续维护在这里。

## 五、核心文件和函数说明

### 1. `package.json`

作用：项目的总配置文件。

主要内容：

- `scripts`：定义 `npm run dev`、`npm run build`、`npm run pack:dir` 等命令。
- `dependencies`：运行时依赖，例如 React、Electron、Prisma、react-markdown。
- `devDependencies`：开发和构建依赖，例如 TypeScript、Vite、electron-builder。
- `main`：Electron 启动入口，当前为 `dist-electron/electron/main.js`。
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

作用：Electron 主进程入口。

重构后它只负责：

- 读取 `.env`。
- 设置 Electron 全局开关。
- 注册 IPC handlers。
- 创建窗口。
- 监听窗口关闭。

它不再直接写 Dify 请求、本地 JSON 读写、文件下载、数据库逻辑。

### 7. `electron/window/`

作用：窗口相关逻辑。

主要文件：

- `createWindow.ts`：创建 `BrowserWindow`，加载 Vite 或生产 HTML，设置 `Ctrl + Shift + I` 打开 DevTools，拦截外部链接。
- `windowPaths.ts`：管理窗口图标、管理员配置、本地数据文件等路径。

### 8. `electron/services/`

作用：Electron Main 中的业务服务层。

主要文件：

- `adminConfigService.ts`：读取和规范化 `config/app-config.json`。
- `appDataService.ts`：读写 `aistudio-data.json`，合并管理员配置，返回脱敏数据。
- `difyService.ts`：调用 Dify `/chat-messages`、解析 streaming、获取建议问题、提交点赞/点踩。
- `downloadService.ts`：弹出系统另存为窗口，下载远程文件并保存。

### 9. `electron/ipc/`

作用：IPC 分层。React 前端通过 preload 调用 Main，具体处理逻辑在这里注册。

主要文件：

- `registerIpcHandlers.ts`：统一注册所有 IPC。
- `appHandlers.ts`：处理 `app:get-data`。
- `conversationHandlers.ts`：处理 `conversation:create`、`conversation:delete`。
- `messageHandlers.ts`：处理 `message:send`、`message:stop`、`message:feedback`。
- `fileHandlers.ts`：处理 `file:download`。

### 10. `electron/database/` 和 `electron/db.ts`

作用：Prisma / SQL Server 数据库层。

主要文件：

- `database/prismaClient.ts`：创建 Prisma Client 和 SQL Server adapter。
- `database/health.ts`：数据库连接检查和断开连接。
- `db.ts`：兼容出口，统一导出 `prisma`、`checkDatabaseConnection`、`closeDatabaseConnection`。

后续如果增加文件任务、权限、审计日志，建议继续增加：

```text
electron/database/repositories/
electron/database/services/
```

### 11. `electron/preload.ts`

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

### 12. `shared/types/`

作用：前后端共享 TypeScript 类型。

主要文件：

- `app.ts`：`Assistant`、`Conversation`、`Message`、`AppData` 等业务类型。
- `dify.ts`：Dify streaming、文件、返回结果相关类型。
- `ipc.ts`：Preload 暴露给前端的请求、响应和 `DifyApiBridge` 类型。

### 13. `src/main.tsx` 和 `src/App.tsx`

作用：React 前端入口和主页面。

- `main.tsx`：只负责把 `<App />` 挂载到 `index.html` 的 `root`。
- `App.tsx`：负责组合页面状态、会话数据、发送消息、下载、反馈等核心页面逻辑。

### 14. `src/components/`

作用：前端 UI 组件层。

当前已拆分：

- `layout/Sidebar.tsx`：左侧导航。
- `layout/StatusBanner.tsx`：成功/失败提示条。
- `chat/MessageAttachments.tsx`：消息附件下载。
- `chat/SuggestedQuestions.tsx`：下一轮建议问题。
- `chat/MessageFeedback.tsx`：点赞/点踩。
- `chat/MessageComposer.tsx`：底部输入框和发送/停止按钮。
- `markdown/MarkdownMessage.tsx`：Markdown 渲染。
- `translate/TranslateWorkspace.tsx`：翻译 Web 页面。

### 15. `src/hooks/`

作用：前端状态逻辑层。

当前已拆分：

- `useStatusMessage.ts`：提示信息和 5 秒自动关闭。
- `useMessageStreaming.ts`：Dify streaming 监听、流式内容、动态加载点。
- `useScrollToBottom.ts`：聊天滚动状态、回到底部按钮。

### 16. `src/services/difyApiClient.ts`

作用：前端 API client 层。

它封装 `window.difyApi`，让组件和 hooks 不直接散落调用全局对象。后续如果从 Electron IPC 改成 HTTP 后端 API，优先改这里。

### 17. `src/styles.css`

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

### 18. `src/startup.css`

作用：启动等待框样式。

在 React 数据还没有加载完成前，`index.html` 会先展示“正在加载界面，请稍后...”。当 `loadData()` 完成后，React 调用 `hideStartupWait()` 移除这个等待框。

### 19. `src/vite-env.d.ts`

作用：前端全局类型声明。

它主要声明：

- `Window.difyApi`
- `webview` JSX 标签

业务类型已经移动到 `shared/types/`。

### 20. `prisma/schema.prisma`

作用：Prisma 数据库模型文件。

当前内容：

- `generator client`：生成 Prisma Client。
- `datasource db`：数据库类型为 `sqlserver`。
- `product_table`：示例数据库表映射。

如果以后数据库表越来越多，通常需要在这里继续增加模型，或者用 `npm run prisma:pull` 从现有数据库反向生成。

### 21. `prisma.config.ts`

作用：Prisma 7 的配置文件。

主要内容：

- 指定 schema 文件位置。
- 从 `.env` 读取 `DATABASE_URL`。
- 指定 migrations 目录。

### 22. `config/app-config.json`

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

### 23. `scripts/wait-for-vite.cjs`

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

### 24. `scripts/clean-release.cjs`

作用：打包前清理旧产物。

主要函数：

- `removeTarget(name)`：删除 `release/win-unpacked` 和 `release/win-unpacked.tmp`。

### 25. `build/app-icon.ico`

作用：Windows 应用和窗口图标。

它在 `package.json` 的 `build.win.icon` 中被使用。

### 26. `src/LOGO/`

作用：存放前端界面使用的 logo 图片。

当前 `src/main.tsx` 使用：

```ts
import tbeaLogo from './LOGO/TBEA3.png';
```

### 27. `.env` 和 `.env.example`

`.env.example` 是示例配置，适合提交到代码仓库。

`.env` 是本机真实配置，一般不要提交。

当前常见字段：

```env
DIFY_API_BASE_URL=http://你的内网dify地址/v1
DIFY_API_KEY=app-xxxxxxxxxxxxxxxx
DIFY_USER_ID=desktop-demo-user
DATABASE_URL="sqlserver://localhost:1433;database=aistudio;user=sa;password=your_password;trustServerCertificate=true"
```

### 28. `setup.bat`

作用：Windows 下双击安装依赖。

本质上通常等价于执行：

```bash
npm install
```

### 29. `start-dev.bat`

作用：Windows 下双击开发启动。

本质上通常等价于执行：

```bash
npm run dev
```

### 30. `pack-dir.bat`

作用：Windows 下双击打包绿色版。

本质上通常等价于执行：

```bash
npm run pack:dir
```

### 31. `package-lock.json`

作用：锁定依赖的精确版本。

你执行 `npm install` 时，npm 会根据 `package.json` 和 `package-lock.json` 安装依赖。这个文件可以保证不同电脑安装出来的依赖版本尽量一致。

一般不手动修改它。安装、卸载、升级依赖时它会自动变化。

### 32. `.gitignore`

作用：告诉 Git 哪些文件不要提交。

通常会忽略：

- `node_modules/`
- `dist/`
- `dist-electron/`
- `release/`
- `.env`

### 33. `docs/PROJECT_GUIDE.md`

作用：项目补充说明文档。

如果 README 是总说明，那么 `docs/PROJECT_GUIDE.md` 可以放更细的开发记录、二次开发说明或业务设计文档。

### 34. `.vscode/`

作用：VS Code 编辑器配置目录。

它可能包含编辑器推荐设置、调试配置等。不是程序运行必需文件。

### 35. `dist/`、`dist-electron/`、`release/`

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
3. 看 `src/App.tsx`，理解主页面如何组合数据和组件。
4. 看 `src/components/`，理解界面如何拆成组件。
5. 看 `src/hooks/`，理解流式消息、提示、滚动等状态逻辑。
6. 看 `electron/preload.ts`，理解前端如何调用后端能力。
7. 看 `electron/ipc/` 和 `electron/services/`，理解 IPC 如何调用业务服务。
8. 最后看 `electron/database/`、`electron/db.ts` 和 `prisma/schema.prisma`。

建议每次改动后执行：

```bash
npm run build
```

如果构建成功，说明 TypeScript 和打包流程基本没有问题。

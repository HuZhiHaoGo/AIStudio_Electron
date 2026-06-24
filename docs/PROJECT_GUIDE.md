# AIStudio Electron 项目结构说明

这份文档按新手视角解释项目。你可以先把它当成“地图”，再去看代码。

## 1. 项目整体在做什么

这个项目是一个桌面版 AI 助手客户端：

1. 用户在界面里选择助手、选择会话、输入问题。
2. React 前端把操作发给 Electron 的 `preload`。
3. `preload` 再通过 IPC 发给 Electron Main。
4. Electron Main 负责保存本地数据，并调用 Dify 的 `/chat-messages` 接口。
5. Dify 返回结果后，Electron Main 把消息存到本地，再返回给 React 界面展示。

## 2. 目录结构

```text
AIStudio_Electron/
  electron/                 Electron 主进程相关代码
    main.ts                 创建窗口、本地存储、调用 Dify API、处理 IPC
    preload.ts              安全桥梁，把少量 API 暴露给 React
    tsconfig.json           Electron 代码的 TypeScript 编译配置

  src/                      React 前端代码
    main.tsx                三栏主界面：助手、会话、聊天窗口
    MarkdownMessage.tsx     把 Dify 回复的 Markdown 文本渲染成页面
    styles.css              页面样式
    vite-env.d.ts           前端 TypeScript 类型声明

  scripts/
    wait-for-vite.cjs       开发模式下等待 Vite 启动后再启动 Electron
    clean-release.cjs       打包前清理旧的 release 目录

  .vscode/
    launch.json             VSCode 调试配置
    tasks.json              VSCode 调试前置任务

  dist/                     React 打包后的文件
  dist-electron/            Electron TS 编译后的 JS 文件
  release/                  electron-builder 生成的绿色版目录

  package.json              项目依赖、脚本、打包配置
  vite.config.ts            Vite 配置
  tsconfig.json             React 前端 TypeScript 配置
  index.html                React 页面入口 HTML
```

## 3. 三个核心概念

### Assistant 助手

代表一个 Dify 应用配置，里面有：

- 助手名称
- Dify API 地址
- API Key
- 用户 ID

### Conversation 会话

代表一次聊天上下文。每个会话都属于某个助手。

### Message 消息

代表一条聊天消息。消息有两种角色：

- `user`：用户发的问题
- `assistant`：Dify 返回的回答

## 4. 数据保存在哪里

本项目没有使用数据库，而是用一个 JSON 文件保存数据。

文件位置由 Electron 决定：

```text
app.getPath('userData')/aistudio-data.json
```

也就是说，不同电脑、不同用户的数据文件位置可能不同。

这个文件里保存：

```text
assistants      助手配置
conversations   会话列表
messages        聊天记录
```

## 5. 为什么需要 preload.ts

Electron 里有两种世界：

```text
Main 进程：能读写文件、能调用系统能力、能访问 API Key
Renderer 进程：React 页面，负责显示界面
```

为了安全，React 页面不能直接使用 Node.js 的 `fs`、`path` 等能力。

所以项目使用 `preload.ts` 暴露一个受控对象：

```ts
window.difyApi
```

React 只能调用这些明确开放的方法，例如：

```ts
window.difyApi.getData()
window.difyApi.sendMessage(...)
```

## 6. 点击发送后发生什么

以用户点击“发送”为例：

1. `src/main.tsx` 的 `sendMessage()` 被触发。
2. React 调用：

```ts
window.difyApi.sendMessage(...)
```

3. `electron/preload.ts` 把请求转给 Electron Main：

```ts
ipcRenderer.invoke('message:send', request)
```

4. `electron/main.ts` 里的这段代码接住请求：

```ts
ipcMain.handle('message:send', ...)
```

5. Main 先把用户问题写入本地 JSON。
6. Main 调用 Dify：

```text
POST /chat-messages
```

7. Dify 返回回答。
8. Main 把回答写入本地 JSON。
9. Main 把最新数据返回给 React。
10. React 重新渲染聊天窗口。

## 7. 开发和打包命令

开发运行：

```powershell
npm run dev
```

只启动 Vite，配合 VSCode 调试：

```powershell
npm run dev:vite
```

构建检查：

```powershell
npm run build
```

生成绿色版：

```powershell
npm run pack:dir
```

绿色版产物位置：

```text
release/win-unpacked/AIStudio.exe
```

## 8. 新手读代码顺序

建议按这个顺序看：

1. `package.json`：先看有哪些命令。
2. `electron/main.ts`：理解窗口、本地数据、Dify 请求。
3. `electron/preload.ts`：理解前后端怎么通信。
4. `src/main.tsx`：理解界面和按钮点击逻辑。
5. `src/MarkdownMessage.tsx`：理解回答如何渲染成 Markdown。
6. `src/styles.css`：最后再看样式。

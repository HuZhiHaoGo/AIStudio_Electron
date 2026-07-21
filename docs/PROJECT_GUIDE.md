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
  electron/                       Electron 主进程
    ipc/                          接收渲染进程请求，组织一次业务操作
    services/                     本地数据、Dify、RAGFlow 和下载服务
    window/                       创建窗口和管理运行路径
    main.ts                       主进程启动入口
    preload.ts                    受控的 IPC 安全桥

  shared/                         两个进程都能使用的纯 TypeScript 代码
    ipc/channels.ts               IPC 频道名称的唯一来源
    types/                        业务类型、公开数据类型和 IPC 契约

  src/                            React 渲染进程
    components/                   可以跨功能复用的界面组件
    features/assistants/          助手设置页面
    features/conversations/       会话导航
    features/chat/                当前会话和消息界面
    hooks/                        流式消息、滚动和状态提示
    services/                     对 window.difyApi 的调用封装
    styles/                       按职责拆分的样式
    App.tsx                       状态、业务命令和页面组合
    main.tsx                      React 挂载入口
    styles.css                    样式导入顺序入口

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

当前聊天数据和助手管理配置使用两个 JSON 文件保存。这样渲染进程读取聊天状态时，
主进程可以先移除助手的真实 API Key，只返回 `PublicAssistant`。

文件位置由 Electron 决定：

```text
app.getPath('userData')/aistudio-data.json
```

也就是说，不同电脑、不同用户的数据文件位置可能不同。

`aistudio-data.json` 保存：

```text
conversations   会话列表
messages        聊天记录
annotations     质量标注
```

助手配置由 `electron/services/adminConfigService.ts` 管理。开发模式使用项目中的
`config/app-config.json`，打包运行后使用用户数据目录下的 `config/app-config.json`。
真实 API Key 只供 Electron 主进程调用 Dify，React 只能看到掩码。

设置页入口使用产品指定的固定本地密码，验证逻辑保留在
`electron/ipc/appHandlers.ts`；它的用途是界面访问控制，不参与 API Key 加密。

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

需要特别注意：Electron 沙箱中的 `preload.ts` 运行时不能加载项目内的相对模块。
因此 IPC 频道值会直接写在 preload 中，再用 TypeScript `satisfies` 对照
`shared/ipc/channels.ts` 做编译期校验。不要把共享频道作为普通运行时 import 引入 preload。

## 6. 点击发送后发生什么

以用户点击“发送”为例：

1. `src/features/chat/ChatPane.tsx` 把发送操作交给 `src/App.tsx` 的 `sendMessage()`。
2. React 调用：

```ts
window.difyApi.sendMessage(...)
```

3. `electron/preload.ts` 把请求转给 Electron Main：

```ts
ipcRenderer.invoke(IPC_CHANNELS.messageSend, request)
```

4. `electron/ipc/messageHandlers.ts` 接住请求：

```ts
ipcMain.handle(IPC_CHANNELS.messageSend, ...)
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
2. `src/main.tsx`：理解 React 从哪里挂载。
3. `src/App.tsx`：理解应用状态和业务命令如何连接各个视图。
4. `src/features/`：分别阅读助手设置、会话导航和聊天界面。
5. `src/services/difyApiClient.ts`：理解页面如何调用安全桥。
6. `electron/preload.ts` 和 `shared/ipc/channels.ts`：理解前后端怎么通信。
7. `electron/ipc/`：理解主进程如何接收具体操作。
8. `electron/services/`：理解数据保存、Dify 和 RAGFlow 请求。
9. `src/components/markdown/MarkdownMessage.tsx`：理解回答如何渲染成富文本。
10. `src/styles.css`：先看样式入口，再按需进入 `src/styles/` 中的功能文件。

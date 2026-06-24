# AIStudio_Electron
# AI 助手客户端 Demo

这是一个面向内网 Dify 机器人的桌面端对话 demo，技术栈是 Electron + React + TypeScript。

当前已经包含：

- 左侧助手列表：可新增助手、保存 Dify 地址、API Key、用户 ID。
- 中间会话列表：每个助手有自己的会话列表，可新建和删除会话。
- 右侧聊天窗口：发送消息、展示回答、保存本地聊天记录。
- 聊天体验：Dify 回复支持基础 Markdown 显示，聊天区支持滚动查看上下文。
- 输入方式：按 `Enter` 发送，按 `Shift + Enter` 换行。
- Electron Main：统一读写本地配置、存储聊天记录、调用 Dify `/chat-messages`。
- 窗口设置：已关闭 Electron 默认的 File/Edit/View 菜单栏。
- 本地数据文件：保存到 Electron 的 `userData/aistudio-data.json`，前端不会直接接触真实 API Key。

## 1. 安装依赖

Windows 新手推荐直接双击：

```text
setup.bat
```

或者在终端里运行：

```bash
npm install
```

## 2. 配置 Dify

复制 `.env.example` 为 `.env`，然后改成你的内网 Dify 信息：

```env
DIFY_API_BASE_URL=http://你的内网dify地址/v1
DIFY_API_KEY=app-xxxxxxxxxxxxxxxx
DIFY_USER_ID=desktop-demo-user
```

说明：

- `DIFY_API_BASE_URL` 要写到 `/v1`，例如 `http://192.168.1.10/v1`。
- `DIFY_API_KEY` 是 Dify 应用的 API Key。
- `DIFY_USER_ID` 可以先不改，用来让 Dify 区分不同用户。
- `.env` 只用于第一次创建默认助手。之后你也可以直接在客户端左侧“助手配置”里修改并保存。

## 3. 开发运行

Windows 新手推荐直接双击：

```text
start-dev.bat
```

或者在终端里运行：

```bash
npm run dev
```

如果你电脑里设置过 `ELECTRON_RUN_AS_NODE=1`，请优先使用 `start-dev.bat`，脚本里已经自动清除了这个变量。

运行后会打开 Electron 桌面窗口。

## 4. 打包前构建检查

```bash
npm run build
```

当前 demo 已经接入 Dify 的 `POST /chat-messages` 接口，并使用 `blocking` 模式返回完整回答。

## 项目结构

```text
electron/
  main.ts       Electron 主进程，负责窗口、本地存储和 Dify API 请求
  preload.ts    安全暴露 window.difyApi 给 React
src/
  main.tsx      React 三栏对话界面
  styles.css    页面样式
```

## 后续可以继续加的功能

- 流式输出：把 `response_mode` 改成 `streaming` 并解析 SSE。
- 多会话列表：保存多个 `conversation_id`。
- 本地历史记录：使用 SQLite 或 Electron Store 保存聊天记录。
- 内网登录：接企业账号体系或统一认证。

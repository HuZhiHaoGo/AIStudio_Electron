# Dify 集成架构

## 分层

```text
React UI
  -> src/services/difyApiClient.ts
  -> electron/preload.ts（受控 IPC）
  -> electron/ipc/*Handlers.ts（用例编排与持久化）
  -> electron/services/dify/client.ts（Dify 端点）
       -> capabilities.ts（能力发现与参数归一化）
       -> sseParser.ts（增量 SSE 协议解析）
       -> eventAccumulator.ts（事件聚合为消息领域模型）
```

UI 不直接拼接 Dify URL，也不持有 API Key。新增 Dify 端点应先加入 `client.ts`，再通过 IPC 暴露最小用例。

## 应用类型

- `chat`、`advanced-chat`、`agent-chat`：`POST /chat-messages`
- `workflow`：`POST /workflows/run`
- `completion`：`POST /completion-messages`

保存或刷新助手时读取 `/parameters`、`/info`、`/site`，归一化为 `DifyCapabilities`。界面只能根据能力决定是否展示上传、动态输入、推荐问题、远端会话和 HITL 等功能，不能根据助手名称猜测。

## SSE 处理

`DifySseParser` 只负责增量协议解析，支持拆包、CRLF、多行 data 和 `[DONE]`。`DifyEventAccumulator` 负责处理消息、Agent、Workflow、节点、迭代、循环、文件、引用、错误和人工介入事件。不要在 IPC handler 或 React 组件中再次解析 SSE。

## 数据兼容

本地数据当前为 `schemaVersion: 2`。读取旧 JSON 时为新增字段提供默认值，写入时不保存助手密钥；助手和密钥仍来自管理员配置文件。

## 验证

```powershell
npm test
npm run build
```

协议变更至少应增加 SSE 拆包测试或能力归一化测试。涉及真实 Dify 版本差异的功能，还需要分别使用 Chatflow、Workflow、文本生成应用进行集成验证。

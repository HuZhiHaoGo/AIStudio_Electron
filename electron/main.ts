import {
  app,
  BrowserWindow,
  Menu,
  ipcMain,
  shell,
  dialog,
  type WebContents,
} from "electron";
import path from "node:path";
import fs from "node:fs/promises";
import crypto from "node:crypto";
import dotenv from "dotenv";

// 读取 .env 文件。开发阶段可以用它提供默认 Dify 地址和 API Key。
dotenv.config();

// 部分 Windows 环境里 Electron 的 GPU 进程会启动失败，表现为窗口白屏。
// 禁用硬件加速可以让渲染进程走更稳的 CPU 路径。
app.disableHardwareAcceleration();
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("disable-gpu-compositing");

// 开发模式下，Electron 会加载 Vite dev server；打包后会加载 dist/index.html。
const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);

type Role = "user" | "assistant";
type MessageFeedbackRating = "like" | "dislike" | null;

// 一个 Assistant 就是一套 Dify 应用配置。
type Assistant = {
  id: string;
  name: string;
  apiBaseUrl: string;
  apiKey: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
};

// 一个 Conversation 就是左侧某个助手下面的一次聊天上下文。
type Conversation = {
  id: string;
  assistantId: string;
  title: string;
  difyConversationId?: string;
  createdAt: string;
  updatedAt: string;
};

// 一条 Message 就是聊天窗口里的一条消息。
type Message = {
  id: string;
  conversationId: string;
  role: Role;
  content: string;
  attachments?: MessageAttachment[];
  difyMessageId?: string;
  suggestedQuestions?: string[];
  feedbackRating?: MessageFeedbackRating;
  feedbackContent?: string;
  createdAt: string;
  status?: "ok" | "error";
};

type MessageAttachment = {
  id: string;
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
};

type DifyFile = {
  filename?: string;
  name?: string;
  mime_type?: string;
  size?: number;
  related_id?: string;
  url?: string | null;
  remote_url?: string | null;
};

// Dify 流式回答的事件结构，包含了回答内容和可能的文件附件信息。
type DifyStreamEvent = {
  /**
   * event表示事件类型：? 表示这个字段可有可无。
   * message
message_end
workflow_started
workflow_finished
node_started
node_finished
   */
  event?: string;
  answer?: string;
  conversation_id?: string;
  message_id?: string;
  data?: {
    outputs?: {
      answer?: string;
      files?: DifyFile[];
    };
    files?: DifyFile[];
  };
  files?: DifyFile[];
};

// 本地 JSON 文件保存的数据总结构。
type AppData = {
  assistants: Assistant[];
  conversations: Conversation[];
  messages: Message[];
  settings: AppSettings;
};

type AppSettings = {
  translationWebUrl: string;
};

type AdminConfig = {
  assistants: Assistant[];
  translationWebUrl: string;
};

type SendMessageRequest = {
  assistantId: string;
  conversationId: string;
  query: string;
  streamId?: string;
};

type SaveAssistantRequest = {
  id?: string;
  name: string;
  apiBaseUrl: string;
  apiKey: string;
  userId: string;
};

type SaveSettingsRequest = {
  translationWebUrl: string;
};

type DownloadFileRequest = {
  url: string;
  filename?: string;
};

type MessageFeedbackRequest = {
  messageId: string;
  rating: MessageFeedbackRating;
  content?: string;
};

type SendToDifyResult = {
  answer: string;
  difyConversationId?: string;
  difyMessageId?: string;
  attachments: MessageAttachment[];
  suggestedQuestions: string[];
  canceled?: boolean;
};

const activeDifyRequests = new Map<string, AbortController>();

function createId() {
  return crypto.randomUUID();
}

function now() {
  return new Date().toISOString();
}

function wait(milliseconds: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function dataFilePath() {
  // app.getPath('userData') 是 Electron 推荐保存用户数据的位置。
  return path.join(app.getPath("userData"), "aistudio-data.json");
}

function windowIconPath() {
  return app.isPackaged
    ? path.join(process.resourcesPath, "assets", "app-icon.ico")
    : path.join(process.cwd(), "build", "app-icon.ico");
}

function adminConfigPath() {
  const baseDir = app.isPackaged ? process.resourcesPath : process.cwd();
  return path.join(baseDir, "config", "app-config.json");
}

function safeFilename(value?: string) {
  const fallback = "下载文件";
  const name = value?.trim() || fallback;
  return name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_") || fallback;
}

function maskKey(apiKey: string) {
  if (!apiKey) {
    return "";
  }

  if (apiKey.length <= 10) {
    return "******";
  }

  return `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}`;
}

/**
 * 为前端生成公共数据，隐藏真实的 API Key。
 * @param data
 * @returns
 */
function publicData(data: AppData) {
  // 返回给 React 前端的数据不能包含真实 API Key，只给脱敏后的 apiKeyMasked。
  return {
    ...data,
    assistants: data.assistants.map(({ apiKey: _apiKey, ...assistant }) => ({
      ...assistant,
      apiKeyMasked: maskKey(_apiKey),
    })),
  };
}

function defaultData(): AppData {
  return {
    assistants: [],
    conversations: [],
    messages: [],
    settings: {
      translationWebUrl: "",
    },
  };
}

function defaultAdminConfig(): AdminConfig {
  const createdAt = now();

  return {
    assistants: [
      {
        id: "default-assistant",
        name: "默认助手",
        apiBaseUrl:
          process.env.DIFY_API_BASE_URL || "http://你的内网dify地址/v1",
        apiKey: process.env.DIFY_API_KEY || "",
        userId: process.env.DIFY_USER_ID || "desktop-demo-user",
        createdAt,
        updatedAt: createdAt,
      },
    ],
    translationWebUrl: process.env.TRANSLATION_WEB_URL || "",
  };
}

function normalizeAdminConfig(config: Partial<AdminConfig>): AdminConfig {
  const currentTime = now();

  return {
    assistants: (config.assistants || []).map((assistant, index) => ({
      id: assistant.id || `assistant-${index + 1}`,
      name: assistant.name || `助手${index + 1}`,
      apiBaseUrl: assistant.apiBaseUrl || "",
      apiKey: assistant.apiKey || "",
      userId: assistant.userId || "desktop-demo-user",
      createdAt: assistant.createdAt || currentTime,
      updatedAt: assistant.updatedAt || currentTime,
    })),
    translationWebUrl: config.translationWebUrl || "",
  };
}

async function readAdminConfig(): Promise<AdminConfig> {
  const filePath = adminConfigPath();

  try {
    const content = await fs.readFile(filePath, "utf-8");
    return normalizeAdminConfig(JSON.parse(content) as Partial<AdminConfig>);
  } catch (error) {
    const errorCode =
      error && typeof error === "object" && "code" in error ? error.code : "";

    if (errorCode && errorCode !== "ENOENT") {
      throw new Error(`管理员配置文件读取失败：${filePath}`);
    }

    const config = defaultAdminConfig();
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(config, null, 2), "utf-8");
    return config;
  }
}

async function readData(): Promise<AppData> {
  const filePath = dataFilePath(); //获取本地json的文件路径
  const adminConfig = await readAdminConfig();

  try {
    // 如果本地数据文件存在，就读取并解析 JSON。
    const content = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(content) as AppData;

    return {
      assistants: adminConfig.assistants,
      conversations: data.conversations || [],
      messages: (data.messages || []).map((message) => ({
        //map（）的作用：对数组中的每一个元素进行处理，生成一个新的数组。
        ...message, ///...message  对象展开运算符，表示将 message 对象的所有属性展开并复制到新的对象中。
        attachments: message.attachments || [],
        suggestedQuestions: message.suggestedQuestions || [],
        feedbackRating: message.feedbackRating ?? null,
        feedbackContent: message.feedbackContent || "",
      })),
      settings: {
        translationWebUrl: adminConfig.translationWebUrl,
      },
    };
  } catch {
    // 第一次启动时文件不存在，就创建一份默认数据。
    const data = {
      ...defaultData(),
      assistants: adminConfig.assistants,
      settings: {
        translationWebUrl: adminConfig.translationWebUrl,
      },
    };
    await writeData(data);
    return data;
  }
}

/**
 * 将数据写入本地 JSON 文件。每次保存助手配置、会话、消息后都调用这个函数。
 */
async function writeData(data: AppData) {
  const filePath = dataFilePath();
  const storedData: AppData = {
    assistants: [],
    conversations: data.conversations,
    messages: data.messages,
    settings: {
      translationWebUrl: "",
    },
  };
  // recursive: true 表示目录不存在时自动创建。
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(storedData, null, 2), "utf-8");
}

function createWindow() {
  // 创建 Electron 桌面窗口。React 页面会显示在这个窗口里。
  const win = new BrowserWindow({
    width: 1320,
    height: 820,
    minWidth: 1050,
    minHeight: 680,
    title: "匠宝Bot",
    icon: windowIconPath(),
    backgroundColor: "#f6f7f9",
    webPreferences: {
      // preload 是 Main 和 React 页面之间的安全桥梁。
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      webviewTag: true,
    },
  });


  win.webContents.on('before-input-event', (event, input) => {
    if (
      input.type === 'keyDown' &&
      input.control &&
      input.shift &&
      input.key.toLowerCase() === 'i'
    ) {
      win.webContents.toggleDevTools();
      event.preventDefault();
    }
  });



  /**
   * 监听 React 页面里所有新打开的链接，如果是 http(s) 链接就用系统默认浏览器打开，其他链接一律禁止打开。
    这样可以防止恶意链接在 Electron 内部打开，保证安全性。
   */
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) {
      void shell.openExternal(url);
    }

    return { action: "deny" };
  });

  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    // 开发模式：加载 Vite 启动的本地网页。
    void win.loadURL(process.env.VITE_DEV_SERVER_URL);
    return;
  }

  // 打包后：加载 dist 目录里的静态 HTML。
  void win.loadFile(path.join(__dirname, "../dist/index.html"));
}

/**
 *  发送用户消息到 Dify，并处理 Dify 的流式回答。Dify Chat 应用的流式对话接口会持续返回多条 SSE 消息，直到回答结束。
 * @param assistant  作用是提供 Dify API 的基本配置信息，包括 apiBaseUrl、apiKey 和 userId。
 * @param query  用户输入的消息内容，会作为 query 字段发送给 Dify。
 * @param difyConversationId  如果是同一个会话的连续消息，需要传入 difyConversationId 来延续上下文；如果是新会话，可以不传。
 * @param stream  如果提供了 streamId 和 sender，就会在收到每条 SSE 消息时通过 IPC 把这条消息的内容实时发送给 React 页面，实现流式更新；如果不提供，就等到完整回答返回后一次性发送给 React。
 * @returns   返回一个 Promise，resolve 的结果包含完整的回答内容 answer、最新的 difyConversationId（如果 Dify 返回了新的）和可能的附件列表 attachments。
 */
async function sendToDify(
  assistant: Assistant,
  query: string,
  difyConversationId?: string,
  stream?: {
    streamId?: string;
    sender: WebContents;
    signal?: AbortSignal;
  },
): Promise<SendToDifyResult> {
  const baseUrl = assistant.apiBaseUrl?.replace(/\/$/, ""); // 去掉末尾的斜杠，避免拼接 URL 时出现双斜杠。 匹配字符串最后面的一个 /，然后把它替换成空字符串 ''

  const decoder = new TextDecoder("utf-8");
  let buffer = "";
  let answer = "";
  let finalAnswer = "";
  let nextDifyConversationId: string | undefined;
  let difyMessageId: string | undefined;
  const attachments: MessageAttachment[] = [];
  const seenAttachmentKeys = new Set<string>();

  /**
   * 
   * @param value  Dify 返回的文件链接可能是完整的 URL，也可能是相对路径。这个函数负责把它们统一转换成完整 URL，方便后续下载使用。
    1. 如果已经是完整的 URL（以 http:// 或 https:// 开头），就直接返回。
    2. 如果是相对路径，就用 new URL() 方法把它转换成以 Dify API Base URL 为基础的完整 URL。
     这样无论 Dify 返回什么格式的链接，我们都能正确处理，保证文件下载功能的稳定性。
   * @returns     完整的 URL 链接字符串，如果输入无效就返回空字符串。
   */
  function normalizeDifyUrl(value?: string | null) {
    if (!value) {
      return "";
    }

    if (/^https?:\/\//i.test(value)) {
      return value;
    }

    return new URL(value, baseUrl).toString();
  }

  /**
   * Dify 的回答内容里可能包含 Markdown 格式的文件链接，这个函数负责把它们转换成可下载的完整 URL。它使用正则表达式匹配 Markdown 链接格式，并调用 normalizeDifyUrl() 处理链接地址，确保用户在聊天窗口里看到的链接都是可点击下载的完整 URL。
   * @param content   回答内容字符串，可能包含 Markdown 格式的文件链接。
   * @returns   处理后的回答内容字符串，里面的文件链接已经被替换成完整 URL。
   */
  function normalizeMarkdownFileLinks(content: string) {
    return content.replace(
      /\]\((\/files\/[^)]+)\)/g,
      (_match, filePath: string) => {
        return `](${normalizeDifyUrl(filePath)})`;
      },
    );
  }

  /**
   *  Dify 的 SSE 消息里可能在不同字段返回文件信息，这个函数负责从这些字段里收集文件信息，去重后添加到 attachments 数组里。它会检查 file.url 和 file.remote_url 两个字段来获取链接地址，并使用 normalizeDifyUrl() 统一转换成完整 URL。同时，它还会根据 file.filename 或 file.name 来确定文件名，如果都没有就用“下载文件”作为默认名。为了避免重复附件，函数会使用 seenAttachmentKeys 集合来记录已经处理过的附件，根据 related_id、URL 或文件名来判断是否重复。
   * @param files  Dify SSE 消息里可能包含文件信息的字段，类型是 DifyFile 数组。函数会从这些字段里提取文件信息并添加到 attachments 数组里。
   * @returns
   */
  function collectFiles(files?: DifyFile[]) {
    if (!files?.length) {
      // 如果没有文件信息就直接返回，避免不必要的处理。
      return;
    }

    for (const file of files) {
      // 遍历每个文件信息，提取链接地址和文件名。
      const url = normalizeDifyUrl(file.url || file.remote_url);
      const name = file.filename || file.name || "下载文件";

      if (!url) {
        continue;
      }

      const duplicateKey = file.related_id || url || name; // 定义一个重复判断的 key，优先使用 related_id，其次是 URL，再次是文件名。这个 key 用来判断附件是否已经处理过，避免重复添加。
      if (seenAttachmentKeys.has(duplicateKey)) {
        continue;
      }

      seenAttachmentKeys.add(duplicateKey);
      attachments.push({
        id: file.related_id || createId(),
        name,
        url,
        mimeType: file.mime_type,
        size: file.size,
      });
    }
  }

  /**
   *  从 Dify SSE 事件里收集文件信息。Dify 可能在不同的字段里返回文件信息，比如 data.outputs.files、data.files 和 files，这个函数会检查这些字段并调用 collectFiles() 来处理它们，确保所有的文件信息都能被正确收集和去重。
   * @param data  Dify SSE 事件对象，可能包含多个字段返回文件信息。函数会从这些字段里提取文件信息并添加到 attachments 数组里。
   */
  function collectFilesFromEvent(data: DifyStreamEvent) {
    collectFiles(data.data?.outputs?.files);
    collectFiles(data.data?.files);
    collectFiles(data.files);
  }

  /**
   *  处理 Dify SSE 消息的一个块。Dify 的流式回答是通过 SSE（Server-Sent Events）发送多条消息组成的，每条消息可能包含部分回答内容和文件信息。这个函数负责解析每条 SSE 消息，提取回答内容并追加到 answer 变量里，同时调用 collectFilesFromEvent() 来收集文件信息。它还会检查是否有新的 conversation_id 返回，如果有就更新 nextDifyConversationId 变量，以便后续消息能延续上下文。
   * @param block   Dify SSE 消息的一个块，可能包含多条以 data: 开头的消息行。函数会解析这些消息行，提取回答内容和文件信息，并更新 answer、attachments 和 nextDifyConversationId 变量。
   */
  function handleSseBlock(block: string) {
    const dataLines = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim());

    for (const dataLine of dataLines) {
      // Dify SSE 消息里会有一条 data: [DONE] 来表示回答结束，这条消息不包含实际内容，可以跳过。
      if (!dataLine || dataLine === "[DONE]") {
        continue;
      }

      //解析json字符串，提取回答内容和文件信息。
      const data = JSON.parse(dataLine) as DifyStreamEvent;
      const outputAnswer = data.data?.outputs?.answer
        ? normalizeMarkdownFileLinks(data.data.outputs.answer)
        : "";
      const chunk = normalizeMarkdownFileLinks(data.answer || "");

      collectFilesFromEvent(data);

      if (outputAnswer) {
        finalAnswer = outputAnswer;
      }

      /**
       * Dify 的流式回答可能会分多条 SSE 消息返回，answer 变量需要把这些消息的内容拼接起来形成完整回答。每当收到一条新的 SSE 消息时，就把这条消息的内容追加到 answer 里，并通过 IPC 实时发送给 React 页面，这样用户就能看到流式更新的回答内容，而不需要等到完整回答返回后才看到结果。
       */
      if (chunk) {
        answer += chunk;
        if (stream?.streamId) {
          stream.sender.send("message:stream-chunk", {
            streamId: stream.streamId,
            content: chunk,
          });
        }
      }

      if (data.conversation_id) {
        nextDifyConversationId = data.conversation_id;
      }

      if (data.message_id) {
        difyMessageId = data.message_id;
      }
    }
  }

  try {
    // Dify Chat 应用的流式对话接口。
    const response = await fetch(`${baseUrl}/chat-messages`, {
      method: "POST",
      signal: stream?.signal,
      headers: {
        Authorization: `Bearer ${assistant.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: {},
        query,
        response_mode: "streaming",
        // conversation_id 传给 Dify 后，Dify 才能延续上下文。
        conversation_id: difyConversationId || "",
        user: assistant.userId || "desktop-demo-user",
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`AI 请求失败：HTTP ${response.status} ${detail}`);
    }

    if (!response.body) {
      throw new Error("AI 未返回可读取的流。");
    }

    const reader = response.body.getReader();

    /**
     * 不断读取 Dify SSE 消息的流，直到回答结束。Dify 的流式回答是通过 SSE 发送多条消息组成的，每条消息可能包含部分回答内容和文件信息。这个循环会持续读取这些消息块，调用 handleSseBlock() 来处理每块消息里的内容和文件信息，直到 SSE 流结束（done 为 true）。当 SSE 流结束时，answer 变量里就已经拼接好了完整的回答内容，attachments 数组里也收集好了所有的附件信息，可以返回给 React 页面使用。
     */
    while (true) {
      const { value, done } = await reader.read();

      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const blocks = buffer.split(/\r?\n\r?\n/);
      buffer = blocks.pop() || "";

      for (const block of blocks) {
        handleSseBlock(block);
      }
    }

    buffer += decoder.decode();

    if (buffer.trim()) {
      handleSseBlock(buffer);
    }
  } catch (error) {
    if (stream?.signal?.aborted) {
      return {
        answer: answer || "已停止生成。",
        difyConversationId: nextDifyConversationId,
        difyMessageId,
        attachments,
        suggestedQuestions: [],
        canceled: true,
      };
    }

    throw error;
  }

  const suggestedQuestions = difyMessageId
    ? await fetchSuggestedQuestionsWithRetry(assistant, difyMessageId)
    : [];
  const completeAnswer = finalAnswer || answer;

  return {
    answer: completeAnswer || `${assistant.name} 返回了空回答。`,
    difyConversationId: nextDifyConversationId,
    difyMessageId,
    attachments,
    suggestedQuestions,
  };
}

async function fetchSuggestedQuestionsWithRetry(
  assistant: Assistant,
  messageId: string,
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const questions = await fetchSuggestedQuestions(assistant, messageId);

      if (questions.length || attempt === 2) {
        return questions;
      }
    } catch {
      if (attempt === 2) {
        return [];
      }
    }

    await wait(350);
  }

  return [];
}

async function fetchSuggestedQuestions(
  assistant: Assistant,
  messageId: string,
) {
  const baseUrl = assistant.apiBaseUrl?.replace(/\/$/, "");
  const user = encodeURIComponent(assistant.userId || "desktop-demo-user");
  const response = await fetch(
    `${baseUrl}/messages/${encodeURIComponent(messageId)}/suggested?user=${user}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${assistant.apiKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`建议问题获取失败：HTTP ${response.status}`);
  }

  const body = (await response.json()) as {
    result?: string;
    data?: unknown;
  };

  if (body.result !== "success" || !Array.isArray(body.data)) {
    return [];
  }

  return body.data.filter(
    (item): item is string => typeof item === "string" && Boolean(item.trim()),
  );
}

async function sendDifyMessageFeedback(
  assistant: Assistant,
  messageId: string,
  rating: MessageFeedbackRating,
  content: string,
) {
  // Dify 的消息反馈接口：rating 可以是 like、dislike 或 null，null 表示撤销反馈。
  const baseUrl = assistant.apiBaseUrl?.replace(/\/$/, "");
  const response = await fetch(
    `${baseUrl}/messages/${encodeURIComponent(messageId)}/feedbacks`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${assistant.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        rating,
        user: assistant.userId || "desktop-demo-user",
        content,
      }),
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`反馈提交失败：HTTP ${response.status} ${detail}`);
  }

  const body = (await response.json()) as {
    result?: string;
  };

  if (body.result !== "success") {
    throw new Error("反馈提交失败：Dify 未返回 success。");
  }
}

// React 启动时调用：读取助手、会话、消息。
ipcMain.handle("app:get-data", async () => {
  const data = await readData();
  return publicData(data);
});

// 新建一个会话，默认标题是“新会话”。
ipcMain.handle("conversation:create", async (_event, assistantId: string) => {
  const data = await readData();
  const currentTime = now();
  const conversation: Conversation = {
    id: createId(),
    assistantId,
    title: "新会话",
    createdAt: currentTime,
    updatedAt: currentTime,
  };

  data.conversations.unshift(conversation);
  await writeData(data);
  return publicData(data);
});

// 删除会话时，同时删除这个会话下的所有消息。
ipcMain.handle(
  "conversation:delete",
  async (_event, conversationId: string) => {
    const data = await readData();
    data.conversations = data.conversations.filter(
      (conversation) => conversation.id !== conversationId,
    );
    data.messages = data.messages.filter(
      (message) => message.conversationId !== conversationId,
    );
    await writeData(data);
    return publicData(data);
  },
);

ipcMain.handle("file:download", async (event, request: DownloadFileRequest) => {
  if (!/^https?:\/\//i.test(request.url)) {
    throw new Error("文件下载地址无效。");
  }

  const owner = BrowserWindow.fromWebContents(event.sender) || undefined;
  const defaultPath = path.join(
    app.getPath("downloads"),
    safeFilename(request.filename),
  );
  const saveOptions = {
    title: "保存文件",
    defaultPath,
    buttonLabel: "保存",
  };
  const selected = owner
    ? await dialog.showSaveDialog(owner, saveOptions)
    : await dialog.showSaveDialog(saveOptions);

  if (selected.canceled || !selected.filePath) {
    return {
      canceled: true,
    };
  }

  const response = await fetch(request.url);

  if (!response.ok) {
    throw new Error(`文件下载失败：HTTP ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(selected.filePath, buffer);

  return {
    canceled: false,
    filePath: selected.filePath,
  };
});

ipcMain.handle("message:stop", async (_event, streamId: string) => {
  const controller = activeDifyRequests.get(streamId);

  if (!controller) {
    return {
      stopped: false,
    };
  }

  controller.abort();
  activeDifyRequests.delete(streamId);

  return {
    stopped: true,
  };
});

ipcMain.handle(
  "message:feedback",
  async (_event, request: MessageFeedbackRequest) => {
    // 前端点击“有帮助 / 需改进”后会走到这里，再由 Main 统一把反馈提交给 Dify。
    const data = await readData();
    const message = data.messages.find((item) => item.id === request.messageId);

    if (!message || message.role !== "assistant") {
      throw new Error("未找到可反馈的 AI 回复。");
    }

    if (!message.difyMessageId) {
      throw new Error("当前消息缺少 Dify message_id，无法提交反馈。");
    }

    const conversation = data.conversations.find(
      (item) => item.id === message.conversationId,
    );
    const assistant = data.assistants.find(
      (item) => item.id === conversation?.assistantId,
    );

    if (!assistant) {
      throw new Error("未找到当前助手配置。");
    }

    const content = request.content?.trim() || "";
    await sendDifyMessageFeedback(
      assistant,
      message.difyMessageId,
      request.rating,
      content,
    );

    message.feedbackRating = request.rating;
    message.feedbackContent = content;
    await writeData(data);

    return publicData(data);
  },
);

// 发送消息的完整流程：保存用户问题 -> 调用 Dify -> 保存助手回答 -> 返回最新数据。
ipcMain.handle("message:send", async (event, request: SendMessageRequest) => {
  const query = request.query.trim();

  if (!query) {
    throw new Error("请输入要发送的内容。");
  }

  const data = await readData();
  const assistant = data.assistants.find(
    (item) => item.id === request.assistantId,
  );
  const conversation = data.conversations.find(
    (item) => item.id === request.conversationId,
  );

  if (!assistant) {
    throw new Error("未找到当前助手配置。");
  }

  if (!conversation) {
    throw new Error("未找到当前会话。");
  }

  const currentTime = now();
  // 先把用户发送的问题保存到本地。
  data.messages.push({
    id: createId(),
    conversationId: conversation.id,
    role: "user",
    content: query,
    createdAt: currentTime,
    status: "ok",
  });

  if (conversation.title === "新会话") {
    // 第一条问题会自动变成会话标题，方便在会话列表里识别。
    conversation.title = query.length > 18 ? `${query.slice(0, 18)}...` : query;
  }

  const abortController = request.streamId ? new AbortController() : undefined;

  if (request.streamId && abortController) {
    activeDifyRequests.set(request.streamId, abortController);
  }

  try {
    // 调用 Dify 并等待完整回答。
    const result = await sendToDify(
      assistant,
      query,
      conversation.difyConversationId,
      {
        streamId: request.streamId,
        sender: event.sender,
        signal: abortController?.signal,
      },
    );
    const replyTime = now();

    // 保存 Dify 返回的回答。
    conversation.difyConversationId =
      result.difyConversationId || conversation.difyConversationId;
    conversation.updatedAt = replyTime;
    data.messages.push({
      id: createId(),
      conversationId: conversation.id,
      role: "assistant",
      content: result.answer,
      attachments: result.attachments,
      difyMessageId: result.difyMessageId,
      suggestedQuestions: result.suggestedQuestions,
      createdAt: replyTime,
      status: "ok",
    });
  } catch (error) {
    // 即使 Dify 请求失败，也把错误信息作为一条 assistant 消息保存，方便用户看到原因。
    const errorMessage =
      error instanceof Error ? error.message : "发送失败，请检查 Dify 配置。";
    const replyTime = now();

    conversation.updatedAt = replyTime;
    data.messages.push({
      id: createId(),
      conversationId: conversation.id,
      role: "assistant",
      content: `发送失败：${errorMessage}`,
      createdAt: replyTime,
      status: "error",
    });
  } finally {
    if (request.streamId) {
      activeDifyRequests.delete(request.streamId);
    }
  }

  // 最近更新的会话排在最前面。
  data.conversations.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  await writeData(data);
  return publicData(data);
});

app.whenReady().then(() => {
  // 去掉 Electron 默认菜单栏中的 File/Edit/View。
  Menu.setApplicationMenu(null);
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  // Windows/Linux 关闭所有窗口后退出应用；macOS 通常会保留应用进程，等待用户再次激活。
  if (process.platform !== "darwin") {
    app.quit();
  }
});

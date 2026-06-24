import { StrictMode, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Bot,
  Check,
  Download,
  Languages,
  MessageSquare,
  MessageSquarePlus,
  Plus,
  Save,
  Send,
  Settings,
  Square,
  Trash2,
  UserRound,
} from 'lucide-react';
import { MarkdownMessage } from './MarkdownMessage';
import './styles.css';
import tbeaLogo from './LOGO/TBEA3.png';

// 左侧“助手配置”表单使用的数据结构。
type AssistantForm = {
  name: string;
  apiBaseUrl: string;
  apiKey: string;
  userId: string;
};

type ActiveView = 'chat' | 'settings' | 'translate';
type SettingsSection = 'assistant' | 'translation';

// React 启动时的空数据，真正数据会从 Electron Main 读取。
const emptyData: AppData = {
  assistants: [],
  conversations: [],
  messages: [],
  settings: {
    translationWebUrl: '',
  },
};

// 把 ISO 时间字符串格式化成适合界面显示的中文时间。
function formatTime(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatFileSize(size?: number) {
  if (!size) {
    return '';
  }

  if (size < 1024) {
    return `${size} B`;
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function normalizeWebUrl(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return '';
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  return `https://${trimmed}`;
}

function hideStartupWait() {
  const startupWait = document.getElementById('startup-wait');

  if (!startupWait) {
    return;
  }

  startupWait.classList.add('hidden');
  window.setTimeout(() => {
    startupWait.remove();
  }, 220);
}

function App() {
  // data 是整个前端最核心的状态：助手、会话、消息都在这里。
  const [data, setData] = useState<AppData>(emptyData);

  // 当前选中的助手 ID 和会话 ID。
  const [selectedAssistantId, setSelectedAssistantId] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState('');
  const [activeView, setActiveView] = useState<ActiveView>('chat');
  const [activeSettingsSection, setActiveSettingsSection] = useState<SettingsSection>('assistant');

  // 左侧助手配置表单。
  const [assistantForm, setAssistantForm] = useState<AssistantForm>({
    name: '',
    apiBaseUrl: '',
    apiKey: '',
    userId: '',
  });
  const [translationWebUrl, setTranslationWebUrl] = useState('');
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [loadingDots, setLoadingDots] = useState('.');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  // 用户往上翻历史时显示“回到底部”按钮。
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);

  // ref 用来直接操作 DOM，比如让输入框重新聚焦、让消息列表滚动。
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 记录用户是否停留在消息底部。用户在看历史时，不要强行滚到底部。
  const shouldStickToBottomRef = useRef(true);
  const showScrollToBottomRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);
  const activeStreamIdRef = useRef('');
  const hasHiddenStartupWaitRef = useRef(false);

  // 根据选中 ID 找出当前助手、当前会话、当前消息列表。
  const selectedAssistant = data.assistants.find((assistant) => assistant.id === selectedAssistantId);
  const conversations = useMemo(
    () => data.conversations.filter((conversation) => conversation.assistantId === selectedAssistantId),
    [data.conversations, selectedAssistantId],
  );
  const selectedConversation = conversations.find((conversation) => conversation.id === selectedConversationId);
  const messages = useMemo(
    () => data.messages.filter((message) => message.conversationId === selectedConversationId),
    [data.messages, selectedConversationId],
  );
  const canSend = Boolean(selectedAssistant && selectedConversation && input.trim()) && !isSending;
  const translationWebSrc = normalizeWebUrl(data.settings.translationWebUrl);
  const activeAssistantName = selectedAssistant?.name || '助手';

  // 页面第一次打开时，从 Electron Main 读取本地数据。
  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    return () => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, []);

  useEffect(() => {
    return window.difyApi.onMessageStreamChunk((chunk) => {
      setStreamingContent((current) => {
        if (chunk.streamId !== activeStreamIdRef.current) {
          return current;
        }

        return current + chunk.content;
      });
    });
  }, []);

  useEffect(() => {
    if (!isSending || streamingContent) {
      setLoadingDots('.');
      return;
    }

    const timer = window.setInterval(() => {
      setLoadingDots((current) => (current.length >= 3 ? '.' : `${current}.`));
    }, 420);

    return () => window.clearInterval(timer);
  }, [isSending, streamingContent]);

  // 如果还没有选中助手，就默认选择第一个助手。
  useEffect(() => {
    if (!selectedAssistantId && data.assistants[0]) {
      setSelectedAssistantId(data.assistants[0].id);
    }
  }, [data.assistants, selectedAssistantId]);

  // 切换助手时，把助手配置填入左侧表单。
  useEffect(() => {
    if (selectedAssistant) {
      setAssistantForm({
        name: selectedAssistant.name,
        apiBaseUrl: selectedAssistant.apiBaseUrl,
        apiKey: '',
        userId: selectedAssistant.userId,
      });
    }
  }, [selectedAssistant]);

  useEffect(() => {
    setTranslationWebUrl(data.settings.translationWebUrl || '');
  }, [data.settings.translationWebUrl]);

  useEffect(() => {
    if (!notice && !error) {
      return;
    }

    const timer = window.setTimeout(() => {
      clearStatus();
    }, 5000);

    return () => window.clearTimeout(timer);
  }, [notice, error]);

  // 切换助手后，如果当前会话不属于这个助手，就自动选择这个助手的第一个会话。
  useEffect(() => {
    if (selectedConversationId && conversations.some((conversation) => conversation.id === selectedConversationId)) {
      return;
    }

    setSelectedConversationId(conversations[0]?.id || '');
  }, [conversations, selectedConversationId]);

  // 切换会话时，默认滚到会话底部。
  useEffect(() => {
    shouldStickToBottomRef.current = true;
    setScrollToBottomVisibility(false);
    requestAnimationFrame(() => scrollMessagesToBottom('auto'));
  }, [selectedConversationId]);

  // 有新消息时，只有用户本来就在底部附近，才自动滚到底部。
  useEffect(() => {
    if (shouldStickToBottomRef.current) {
      requestAnimationFrame(() => scrollMessagesToBottom('smooth'));
    }
  }, [messages, isSending, streamingContent]);

  // 判断消息列表是否接近底部。
  function isNearBottom(element: HTMLDivElement) {
    const distanceToBottom = element.scrollHeight - element.scrollTop - element.clientHeight;
    return distanceToBottom < 96;
  }

  // 滚动到消息列表底部。
  function scrollMessagesToBottom(behavior: ScrollBehavior = 'smooth') {
    messagesEndRef.current?.scrollIntoView({ block: 'end', behavior });
  }

  function setScrollToBottomVisibility(isVisible: boolean) {
    showScrollToBottomRef.current = isVisible;
    setShowScrollToBottom(isVisible);
  }

  function clearStatus() {
    setNotice('');
    setError('');
  }

  function renderStatusBanner() {
    if (!notice && !error) {
      return null;
    }

    return (
      <div className={error ? 'status-banner error' : 'status-banner'}>
        <span>{error || notice}</span>
        <button type="button" title="关闭提示" onClick={clearStatus}>
          ×
        </button>
      </div>
    );
  }

  // 用户滚动消息区时，更新“是否贴底”的状态。
  function handleMessagesScroll() {
    if (scrollRafRef.current !== null) {
      return;
    }

    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      updateMessagesScrollState();
    });
  }

  function updateMessagesScrollState() {
    const element = messagesRef.current;

    if (!element) {
      return;
    }

    const nearBottom = isNearBottom(element);
    const nextShowScrollToBottom = !nearBottom;
    shouldStickToBottomRef.current = nearBottom;

    if (showScrollToBottomRef.current !== nextShowScrollToBottom) {
      setScrollToBottomVisibility(nextShowScrollToBottom);
    }
  }

  // 从 Electron Main 读取完整数据。
  async function loadData() {
    try {
      const nextData = await window.difyApi.getData();
      setData(nextData);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '读取本地数据失败。');
    } finally {
      if (!hasHiddenStartupWaitRef.current) {
        hasHiddenStartupWaitRef.current = true;
        hideStartupWait();
      }
    }
  }

  // 保存左侧助手配置。真实 API Key 会传给 Main 保存，前端不会长期持有。
  async function saveAssistant() {
    setIsSaving(true);
    setNotice('');
    setError('');

    try {
      const nextData = await window.difyApi.saveAssistant({
        id: selectedAssistant?.id,
        name: assistantForm.name,
        apiBaseUrl: assistantForm.apiBaseUrl,
        apiKey: assistantForm.apiKey,
        userId: assistantForm.userId,
      });
      setData(nextData);

      const saved = nextData.assistants.find((assistant) =>
        selectedAssistant ? assistant.id === selectedAssistant.id : assistant.name === assistantForm.name,
      );
      if (saved) {
        setSelectedAssistantId(saved.id);
      }
      setNotice('助手配置已保存');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存助手失败。');
    } finally {
      setIsSaving(false);
    }
  }

  async function saveSettings() {
    setIsSavingSettings(true);
    setNotice('');
    setError('');

    try {
      const nextData = await window.difyApi.saveSettings({
        translationWebUrl,
      });
      setData(nextData);
      setNotice('翻译 Web 设置已保存');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存设置失败。');
    } finally {
      setIsSavingSettings(false);
    }
  }

  // 点击“新助手”时，只创建一个表单草稿；点保存后才真正写入本地数据。
  function createAssistantDraft() {
    setSelectedAssistantId('');
    setSelectedConversationId('');
    setAssistantForm({
      name: '新助手',
      apiBaseUrl: 'http://你的内网dify地址/v1',
      apiKey: '',
      userId: 'desktop-demo-user',
    });
    setActiveView('settings');
    setActiveSettingsSection('assistant');
    setNotice('填写配置后点击保存');
  }

  // 新建会话，会话属于当前选中的助手。
  async function createConversation() {
    if (!selectedAssistantId) {
      setError('请先选择或保存一个助手。');
      return;
    }

    const nextData = await window.difyApi.createConversation(selectedAssistantId);
    setData(nextData);
    const created = nextData.conversations.find((conversation) => conversation.assistantId === selectedAssistantId);
    setSelectedConversationId(created?.id || '');
    setInput('');
    inputRef.current?.focus();
  }

  // 删除一个会话。
  async function deleteConversation(conversationId: string) {
    const nextData = await window.difyApi.deleteConversation(conversationId);
    setData(nextData);
  }

  async function downloadFile(url: string, filename?: string) {
    setNotice('');
    setError('');

    try {
      const result = await window.difyApi.downloadFile({
        url,
        filename,
      });

      if (!result.canceled) {
        setNotice('文件已保存');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '文件下载失败。');
    }
  }

  async function stopCurrentMessage() {
    const streamId = activeStreamIdRef.current;

    if (!streamId || !isSending) {
      return;
    }

    try {
      await window.difyApi.stopMessage(streamId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '停止生成失败。');
    }
  }

  // 发送消息：先在前端乐观显示用户问题，再等待 Main 返回最新数据。
  async function sendMessage() {
    const query = input.trim();

    if (!canSend || !selectedAssistant || !selectedConversation || !query) {
      return;
    }

    setIsSending(true);
    shouldStickToBottomRef.current = true;
    setScrollToBottomVisibility(false);
    setInput('');
    setError('');
    setStreamingContent('');
    const streamId = `stream-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    activeStreamIdRef.current = streamId;

    const optimisticUserMessage: Message = {
      id: `optimistic-${Date.now()}`,
      conversationId: selectedConversation.id,
      role: 'user',
      content: query,
      createdAt: new Date().toISOString(),
      status: 'ok',
    };

    setData((current) => ({
      ...current,
      messages: [...current.messages, optimisticUserMessage],
    }));

    try {
      // 真正的 Dify 请求发生在 Electron Main 里，不在 React 里。
      const nextData = await window.difyApi.sendMessage({
        assistantId: selectedAssistant.id,
        conversationId: selectedConversation.id,
        query,
        streamId,
      });
      setData(nextData);
    } catch (err) {
      setError(err instanceof Error ? err.message : '发送失败。');
      await loadData();
    } finally {
      setIsSending(false);
      activeStreamIdRef.current = '';
      setStreamingContent('');
      inputRef.current?.focus();
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="主导航">
        <div className="sidebar-brand">
          {/* <Bot size={24} /> */}
          <img src={tbeaLogo} alt="匠宝Bot" />
        </div>

        <nav className="sidebar-nav">
          <button
            className={`sidebar-button ${activeView === 'chat' ? 'active' : ''}`}
            type="button"
            title="会话"
            onClick={() => setActiveView('chat')}
          >
            <MessageSquare size={22} />
            <span>会话</span>
          </button>
          <button
            className={`sidebar-button ${activeView === 'translate' ? 'active' : ''}`}
            type="button"
            title="翻译"
            onClick={() => setActiveView('translate')}
          >
            <Languages size={22} />
            <span>翻译</span>
          </button>
        </nav>
      </aside>

      {activeView === 'settings' && (
        <section className="settings-workspace" aria-label="设置界面">
          <header className="workspace-header">
            <div>
              <h1>设置</h1>
              <p>
                {activeSettingsSection === 'translation'
                  ? '翻译 Web'
                  : selectedAssistant?.name || '选择或新建一个助手配置'}
              </p>
            </div>
            <button className="primary-action" type="button" onClick={createAssistantDraft}>
              <Plus size={18} />
              新助手
            </button>
          </header>

          <div className="settings-content">
            <aside className="settings-assistant-list">
              <div className="section-title">
                <Bot size={17} />
                助手
              </div>
              <div className="assistant-list">
                {data.assistants.map((assistant) => (
                  <button
                    className={`assistant-item ${
                      assistant.id === selectedAssistantId && activeSettingsSection === 'assistant' ? 'active' : ''
                    }`}
                    key={assistant.id}
                    type="button"
                    onClick={() => {
                      setSelectedAssistantId(assistant.id);
                      setActiveSettingsSection('assistant');
                    }}
                  >
                    <Bot size={18} />
                    <span>{assistant.name}</span>
                  </button>
                ))}

                <button
                  className={`assistant-item translation-setting-item ${
                    activeSettingsSection === 'translation' ? 'active' : ''
                  }`}
                  type="button"
                  onClick={() => setActiveSettingsSection('translation')}
                >
                  <Languages size={18} />
                  <span>翻译网页</span>
                </button>
              </div>
            </aside>

            <div className="settings-panels">
              {activeSettingsSection === 'assistant' && (
              <section className="settings-form-panel">
                <div className="section-title">
                  <Settings size={17} />
                  会话配置
                </div>
                <div className="settings-form-grid">
                  <label>
                    名称
                    <input
                      value={assistantForm.name}
                      onChange={(event) => setAssistantForm((current) => ({ ...current, name: event.target.value }))}
                    />
                  </label>
                  <label>
                    Dify API 地址
                    <input
                      value={assistantForm.apiBaseUrl}
                      placeholder="http://192.168.1.10/v1"
                      onChange={(event) =>
                        setAssistantForm((current) => ({ ...current, apiBaseUrl: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    API Key
                    <input
                      value={assistantForm.apiKey}
                      placeholder={selectedAssistant?.apiKeyMasked || 'app-xxxxxxxx'}
                      type="password"
                      onChange={(event) =>
                        setAssistantForm((current) => ({ ...current, apiKey: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    用户 ID
                    <input
                      value={assistantForm.userId}
                      onChange={(event) => setAssistantForm((current) => ({ ...current, userId: event.target.value }))}
                    />
                  </label>
                </div>

                <div className="settings-actions">
                  <button className="save-button" type="button" onClick={saveAssistant} disabled={isSaving}>
                    {isSaving ? <Check size={17} /> : <Save size={17} />}
                    保存会话配置
                  </button>
                </div>
              </section>
              )}

              {activeSettingsSection === 'translation' && (
              <section className="settings-form-panel">
                <div className="section-title">
                  <Languages size={17} />
                  翻译 Web 配置
                </div>
                <div className="settings-form-grid">
                  <label className="wide-field">
                    Web 地址
                    <input
                      value={translationWebUrl}
                      placeholder="https://translate.example.com"
                      onChange={(event) => setTranslationWebUrl(event.target.value)}
                    />
                  </label>
                </div>

                <div className="settings-actions">
                  <button className="save-button" type="button" onClick={saveSettings} disabled={isSavingSettings}>
                    {isSavingSettings ? <Check size={17} /> : <Save size={17} />}
                    保存翻译 Web
                  </button>
                </div>
              </section>
              )}

              {renderStatusBanner()}
            </div>
          </div>
        </section>
      )}

      {activeView === 'chat' && (
        <section className="chat-workspace" aria-label="会话界面">
          <aside className="conversations-pane">
            <div className="pane-header">
              <div className="pane-header-main">
                <h2>会话</h2>
                <label className="assistant-select-label">
                  <span>助手</span>
                  <select
                    value={selectedAssistantId}
                    onChange={(event) => {
                      setSelectedAssistantId(event.target.value);
                      setSelectedConversationId('');
                    }}
                  >
                    {data.assistants.map((assistant) => (
                      <option key={assistant.id} value={assistant.id}>
                        {assistant.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button className="icon-button" type="button" title="新会话" onClick={createConversation}>
                <MessageSquarePlus size={19} />
              </button>
            </div>

            <div className="conversation-list">
              {conversations.map((conversation) => (
                <button
                  className={`conversation-item ${conversation.id === selectedConversationId ? 'active' : ''}`}
                  key={conversation.id}
                  type="button"
                  onClick={() => setSelectedConversationId(conversation.id)}
                >
                  <span>{conversation.title}</span>
                  <small>{formatTime(conversation.updatedAt)}</small>
                </button>
              ))}

              {conversations.length === 0 && (
                <div className="empty-state">
                  <p>还没有会话</p>
                  <button type="button" onClick={createConversation}>
                    创建第一个会话
                  </button>
                </div>
              )}
            </div>
          </aside>

          <section className="chat-pane" aria-label="聊天窗口">
            <header className="chat-header">
              <div>
                <h2>{selectedConversation?.title || '聊天窗口'}</h2>
                <p>{selectedConversation?.difyConversationId ? `已连接 ${activeAssistantName} 上下文` : '本地新会话'}</p>
              </div>
              {selectedConversation && (
                <button
                  className="danger-button"
                  type="button"
                  title="删除会话"
                  onClick={() => void deleteConversation(selectedConversation.id)}
                >
                  <Trash2 size={18} />
                </button>
              )}
            </header>

            <div className="messages" ref={messagesRef} onScroll={handleMessagesScroll}>
              {messages.length === 0 && (
                <div className="welcome">
                  <Bot size={30} />
                  <h3>开始和 {selectedAssistant?.name || '助手'} 对话</h3>
                </div>
              )}

              {messages.map((message) => (
                <article className={`message ${message.role}`} key={message.id}>
                  <div className="avatar" aria-hidden="true">
                    {message.role === 'assistant' ? <Bot size={18} /> : <UserRound size={18} />}
                  </div>
                  <div className={`bubble ${message.status === 'error' ? 'error' : ''}`}>
                    <MarkdownMessage content={message.content} onDownloadFile={(url, filename) => void downloadFile(url, filename)} />
                    {message.attachments?.length ? (
                      <div className="message-attachments" aria-label="附件">
                        {message.attachments.map((attachment) => (
                          <button
                            className="attachment-link"
                            key={attachment.id}
                            type="button"
                            onClick={() => void downloadFile(attachment.url, attachment.name)}
                          >
                            <Download size={16} />
                            <span>{attachment.name}</span>
                            {attachment.size ? <small>{formatFileSize(attachment.size)}</small> : null}
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <time>{formatTime(message.createdAt)}</time>
                  </div>
                </article>
              ))}

              {isSending && (
                <article className="message assistant">
                  <div className="avatar" aria-hidden="true">
                    <Bot size={18} />
                  </div>
                  <div className={`bubble ${streamingContent ? '' : 'muted'}`}>
                    {streamingContent ? (
                      <MarkdownMessage content={streamingContent} onDownloadFile={(url, filename) => void downloadFile(url, filename)} />
                    ) : (
                      `正在请求 ${activeAssistantName}${loadingDots}`
                    )}
                  </div>
                </article>
              )}

              <div ref={messagesEndRef} />
            </div>

            {showScrollToBottom && (
              <button
                className="scroll-bottom-button"
                type="button"
                onClick={() => {
                  shouldStickToBottomRef.current = true;
                  setScrollToBottomVisibility(false);
                  scrollMessagesToBottom();
                }}
              >
                回到底部
              </button>
            )}

            {renderStatusBanner()}

            <form
              className="composer"
              onSubmit={(event) => {
                event.preventDefault();
                if (!isSending) {
                  void sendMessage();
                }
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                rows={3}
                placeholder={selectedConversation ? '输入问题，按 Enter 发送' : '请先创建会话'}
                disabled={!selectedConversation}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    if (!isSending) {
                      void sendMessage();
                    }
                  }
                }}
              />
              <button
                className={`send-button ${isSending ? 'stop' : ''}`}
                type={isSending ? 'button' : 'submit'}
                disabled={isSending ? false : !canSend}
                title={isSending ? '停止生成' : '发送'}
                onClick={() => {
                  if (isSending) {
                    void stopCurrentMessage();
                  }
                }}
              >
                {isSending ? <Square size={18} /> : <Send size={20} />}
              </button>
            </form>
          </section>
        </section>
      )}

      {activeView === 'translate' && (
        <section className="translate-workspace" aria-label="翻译平台">
          <header className="workspace-header">
            <div>
              <h1>翻译</h1>
              <p>{translationWebSrc || '翻译平台 Web 待配置'}</p>
            </div>
          </header>

          <div className="translation-web-shell">
            {translationWebSrc ? (
              <webview className="translation-frame" src={translationWebSrc} />
            ) : (
              <div className="translation-placeholder">
                <Languages size={34} />
                <h2>翻译平台</h2>
                <p>请先在设置中配置翻译 Web 地址。</p>
              </div>
            )}
          </div>
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

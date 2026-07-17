import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Check,
  Languages,
  MessageSquarePlus,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Settings,
  Trash2,
  UserRound,
} from 'lucide-react';
import { MarkdownMessage } from './components/markdown/MarkdownMessage';
import type { AppData, DifyAppMode, Message, MessageAttachment, MessageFeedbackRating } from '../shared/types/app';
import { MessageAttachments } from './components/chat/MessageAttachments';
import { MessageComposer } from './components/chat/MessageComposer';
import { MessageFeedback } from './components/chat/MessageFeedback';
import { CapabilityInputs } from './components/chat/CapabilityInputs';
import { AssistantPicker } from './components/chat/AssistantPicker';
import { HitlForm, MessageActions, MessageCitations, MessageTraces } from './components/chat/MessageDetails';
import { SuggestedQuestions } from './components/chat/SuggestedQuestions';
import { Sidebar, type ActiveView } from './components/layout/Sidebar';
import { StatusBanner } from './components/layout/StatusBanner';
import { ActionDialog, type ActionDialogField } from './components/shared/ActionDialog';
import { TranslateWorkspace } from './components/translate/TranslateWorkspace';
import { useMessageStreaming } from './hooks/useMessageStreaming';
import { useScrollToBottom } from './hooks/useScrollToBottom';
import { useStatusMessage } from './hooks/useStatusMessage';
import { difyApiClient } from './services/difyApiClient';
import { buildFileAccept } from './utils/fileAccept';

// 左侧“助手配置”表单使用的数据结构。
type AssistantForm = {
  name: string;
  apiBaseUrl: string;
  apiKey: string;
  userId: string;
  mode: DifyAppMode;
};

type SettingsSection = 'assistant' | 'translation';

type PendingDialog = {
  kind: 'rename' | 'delete-conversation' | 'dislike' | 'annotation';
  title: string;
  description?: string;
  confirmText: string;
  message?: Message;
  conversationId?: string;
  fields: ActionDialogField[];
};

// React 启动时的空数据，真正数据会从 Electron Main 读取。
const emptyData: AppData = {
  schemaVersion: 2,
  assistants: [],
  conversations: [],
  messages: [],
  annotations: [],
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

export function App() {
  // data 是整个前端最核心的状态：助手、会话、消息都在这里。
  const [data, setData] = useState<AppData>(emptyData);

  // 当前选中的助手 ID 和会话 ID。
  const [selectedAssistantId, setSelectedAssistantId] = useState('');
  const [isCreatingAssistant, setIsCreatingAssistant] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState('');
  const [activeView, setActiveView] = useState<ActiveView>('chat');
  const [activeSettingsSection, setActiveSettingsSection] = useState<SettingsSection>('assistant');

  // 左侧助手配置表单。
  const [assistantForm, setAssistantForm] = useState<AssistantForm>({
    name: '',
    apiBaseUrl: '',
    apiKey: '',
    userId: '',
    mode: 'chat',
  });
  const [translationWebUrl, setTranslationWebUrl] = useState('');
  const [input, setInput] = useState('');
  const [conversationInputs, setConversationInputs] = useState<Record<string, unknown>>({});
  const [pendingFiles, setPendingFiles] = useState<MessageAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [pendingDialog, setPendingDialog] = useState<PendingDialog | null>(null);
  const [isDialogBusy, setIsDialogBusy] = useState(false);
  const [assistantSyncStatus, setAssistantSyncStatus] = useState('');
  const { notice, error, setNotice, setError, clearStatus } = useStatusMessage();
  const { activeStreamIdRef, streamingContent, setStreamingContent, loadingDots } = useMessageStreaming(isSending);
  const {
    messagesRef,
    messagesEndRef,
    shouldStickToBottomRef,
    showScrollToBottom,
    setScrollToBottomVisibility,
    scrollMessagesToBottom,
    handleMessagesScroll,
  } = useScrollToBottom();

  // ref 用来直接操作 DOM，比如让输入框重新聚焦、让消息列表滚动。
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const hasHiddenStartupWaitRef = useRef(false);
  const hasStartedAutoSyncRef = useRef(false);

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
  const capabilities = selectedAssistant?.capabilities;
  const requiredInputsReady = (capabilities?.inputFields || []).every((field) => !field.required || conversationInputs[field.variable] !== undefined && conversationInputs[field.variable] !== '');
  const canSend = Boolean(selectedAssistant && selectedConversation && (input.trim() || selectedAssistant.mode === 'workflow') && requiredInputsReady) && !isSending && !isUploading;
  const translationWebSrc = normalizeWebUrl(data.settings.translationWebUrl);
  const activeAssistantName = selectedAssistant?.name || '助手';

  // 页面第一次打开时，从 Electron Main 读取本地数据。
  useEffect(() => {
    void loadData();
  }, []);

  // 如果还没有选中助手，就默认选择第一个助手。
  useEffect(() => {
    if (!isCreatingAssistant && !selectedAssistantId && data.assistants[0]) {
      setSelectedAssistantId(data.assistants[0].id);
    }
  }, [data.assistants, isCreatingAssistant, selectedAssistantId]);

  // 切换助手时，把助手配置填入左侧表单。
  useEffect(() => {
    if (selectedAssistant && !isCreatingAssistant) {
      setAssistantForm({
        name: selectedAssistant.name,
        apiBaseUrl: selectedAssistant.apiBaseUrl,
        apiKey: '',
        userId: selectedAssistant.userId,
        mode: selectedAssistant.mode || 'chat',
      });
    }
  }, [isCreatingAssistant, selectedAssistant]);

  useEffect(() => {
    setTranslationWebUrl(data.settings.translationWebUrl || '');
  }, [data.settings.translationWebUrl]);

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

  useEffect(() => {
    const defaults = Object.fromEntries((capabilities?.inputFields || []).filter((field) => field.default !== undefined && field.default !== '').map((field) => [field.variable, field.default]));
    setConversationInputs({ ...defaults, ...(selectedConversation?.inputs || {}) });
    setPendingFiles([]);
  }, [selectedConversationId, selectedAssistantId, capabilities?.inputFields]);

  // 有新消息时，只有用户本来就在底部附近，才自动滚到底部。
  useEffect(() => {
    if (shouldStickToBottomRef.current) {
      requestAnimationFrame(() => scrollMessagesToBottom('smooth'));
    }
  }, [messages, isSending, streamingContent]);

  function renderStatusBanner() {
    return <StatusBanner notice={notice} error={error} onClose={clearStatus} />;
  }

  // 从 Electron Main 读取完整数据。
  async function loadData() {
    try {
      const nextData = await difyApiClient.getData();
      setData(nextData);
      setError('');
      if (!hasStartedAutoSyncRef.current && nextData.assistants.some((assistant) => assistant.apiKeyMasked)) {
        hasStartedAutoSyncRef.current = true;
        void autoRefreshAssistants();
      }
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
      const editingAssistantId = isCreatingAssistant ? undefined : selectedAssistant?.id;
      const existingIds = new Set(data.assistants.map((assistant) => assistant.id));
      const nextData = await difyApiClient.saveAssistant({
        id: editingAssistantId,
        name: assistantForm.name,
        apiBaseUrl: assistantForm.apiBaseUrl,
        apiKey: assistantForm.apiKey,
        userId: assistantForm.userId,
        mode: assistantForm.mode,
      });
      setData(nextData);

      const saved = editingAssistantId
        ? nextData.assistants.find((assistant) => assistant.id === editingAssistantId)
        : nextData.assistants.find((assistant) => !existingIds.has(assistant.id));
      if (saved) {
        setSelectedAssistantId(saved.id);
      }
      setIsCreatingAssistant(false);
      setNotice(editingAssistantId ? '助手配置已更新' : `已新增助手：${saved?.name || '未命名助手'}`);
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
      const nextData = await difyApiClient.saveSettings({
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
    setIsCreatingAssistant(true);
    setSelectedAssistantId('');
    setSelectedConversationId('');
    setAssistantForm({
      name: '',
      apiBaseUrl: '',
      apiKey: '',
      userId: 'desktop-demo-user',
      mode: 'chat',
    });
    setActiveView('settings');
    setActiveSettingsSection('assistant');
    setNotice('填写 Dify API 地址和 API Key 后保存，应用名称会自动读取');
  }

  // 新建会话，会话属于当前选中的助手。
  async function createConversation() {
    if (!selectedAssistantId) {
      setError('请先选择或保存一个助手。');
      return;
    }

    setError('');
    try {
      const nextData = await difyApiClient.createConversation(selectedAssistantId);
      setData(nextData);
      const created = nextData.conversations.find((conversation) => conversation.assistantId === selectedAssistantId);
      setSelectedConversationId(created?.id || '');
      setInput('');
      inputRef.current?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : '会话创建失败。');
    }
  }

  async function autoRefreshAssistants() {
    setAssistantSyncStatus('');
    try {
      const result = await difyApiClient.refreshAllAssistants();
      setData(result.data);
      setAssistantSyncStatus(result.failed.length ? `${result.failed.length} 个助手同步失败` : '');
    } catch {
      setAssistantSyncStatus('自动同步失败');
    }
  }

  // 删除一个会话。
  function deleteConversation(conversationId: string) {
    const conversation = data.conversations.find((item) => item.id === conversationId);
    if (!conversation) return;
    setPendingDialog({
      kind: 'delete-conversation',
      title: '删除会话',
      description: `确定删除“${conversation.title}”吗？本地消息将一并删除，此操作无法撤销。`,
      confirmText: '确认删除',
      conversationId,
      fields: [],
    });
  }

  function renameConversation() {
    if (!selectedConversation) return;
    setPendingDialog({
      kind: 'rename',
      title: '重命名会话',
      confirmText: '保存',
      fields: [{ name: 'title', label: '会话名称', value: selectedConversation.title, required: true }],
    });
  }

  async function refreshAssistant() {
    if (!selectedAssistant) return;
    setIsSaving(true);
    setAssistantSyncStatus('');
    try { setData(await difyApiClient.refreshAssistant(selectedAssistant.id)); setNotice('应用能力和参数已刷新'); setAssistantSyncStatus(''); }
    catch (err) { setError(err instanceof Error ? err.message : '应用信息刷新失败。'); setAssistantSyncStatus('应用信息同步失败'); }
    finally { setIsSaving(false); }
  }

  async function uploadFile(file: File) {
    if (!selectedAssistant) throw new Error('请先选择助手。');
    const mimeType = file.type.toLowerCase();
    const typeLimitMb = mimeType.startsWith('image/') ? capabilities?.fileUpload.imageFileSizeLimitMb
      : mimeType.startsWith('audio/') ? capabilities?.fileUpload.audioFileSizeLimitMb
      : mimeType.startsWith('video/') ? capabilities?.fileUpload.videoFileSizeLimitMb
      : undefined;
    const limitMb = typeLimitMb ?? capabilities?.fileUpload.fileSizeLimitMb;
    if (limitMb && file.size > limitMb * 1024 * 1024) throw new Error(`${file.name} 超过 ${limitMb} MB 限制。`);
    const attachment = await difyApiClient.uploadFile({ assistantId: selectedAssistant.id, name: file.name, mimeType: file.type, bytes: new Uint8Array(await file.arrayBuffer()) });
    return attachment;
  }

  async function chooseFiles(files: File[]) {
    setIsUploading(true); setError('');
    try {
      const limit = capabilities?.fileUpload.numberLimits || files.length;
      const uploaded = await Promise.all(files.slice(0, Math.max(0, limit - pendingFiles.length)).map(uploadFile));
      setPendingFiles((current) => [...current, ...uploaded]);
    } catch (err) { setError(err instanceof Error ? err.message : '文件上传失败。'); }
    finally { setIsUploading(false); }
  }

  async function downloadFile(url: string, filename?: string) {
    setNotice('');
    setError('');

    try {
      const result = await difyApiClient.downloadFile({
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
      await difyApiClient.stopMessage(streamId);
    } catch (err) {
      setError(err instanceof Error ? err.message : '停止生成失败。');
    }
  }

  // 提交 AI 回复的点赞/点踩反馈；再次点击同一个反馈会撤销。
  async function sendFeedback(message: Message, rating: Exclude<MessageFeedbackRating, null>) {
    const nextRating = message.feedbackRating === rating ? null : rating;

    if (nextRating === 'dislike') {
      setPendingDialog({
        kind: 'dislike',
        title: '这条回答需要哪些改进？',
        description: '原因可以留空，提交后可再次点击“需改进”撤销。',
        confirmText: '提交反馈',
        message,
        fields: [{ name: 'content', label: '改进建议', value: message.feedbackContent || '', multiline: true }],
      });
      return;
    }

    await submitFeedback(message, nextRating, nextRating === 'like' ? '用户认为该回答有帮助' : '');
  }

  async function submitFeedback(message: Message, rating: MessageFeedbackRating, content: string) {

    setError('');

    try {
      const nextData = await difyApiClient.sendMessageFeedback({
        messageId: message.id,
        rating,
        content,
      });
      setData(nextData);
      setNotice(rating ? '反馈已提交' : '反馈已撤销');
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '反馈提交失败。');
      return false;
    }
  }

  function createAnnotation(message: Message, answer: string) {
    const index = messages.findIndex((item) => item.id === message.id);
    const question = [...messages.slice(0, index)].reverse().find((item) => item.role === 'user')?.content || '';
    setPendingDialog({
      kind: 'annotation',
      title: '创建标注',
      description: '确认问题和标准答案，将用于后续质量改进。',
      confirmText: '创建标注',
      message,
      fields: [
        { name: 'question', label: '标注问题', value: question, multiline: true, required: true },
        { name: 'answer', label: '标准答案', value: answer, multiline: true, required: true },
      ],
    });
  }

  async function confirmDialog() {
    if (!pendingDialog) return;
    const values = Object.fromEntries(pendingDialog.fields.map((field) => [field.name, field.value.trim()]));
    setIsDialogBusy(true);
    setError('');

    try {
      if (pendingDialog.kind === 'rename' && selectedConversation) {
        setData(await difyApiClient.renameConversation({ conversationId: selectedConversation.id, title: values.title }));
        setNotice('会话名称已更新');
      } else if (pendingDialog.kind === 'delete-conversation' && pendingDialog.conversationId) {
        setData(await difyApiClient.deleteConversation(pendingDialog.conversationId));
        setNotice('会话已删除');
      } else if (pendingDialog.kind === 'dislike' && pendingDialog.message) {
        if (!await submitFeedback(pendingDialog.message, 'dislike', values.content || '')) return;
      } else if (pendingDialog.kind === 'annotation' && pendingDialog.message) {
        setData(await difyApiClient.createAnnotation({
          messageId: pendingDialog.message.id,
          question: values.question,
          answer: values.answer,
        }));
        setNotice('标注已创建');
      }
      setPendingDialog(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败。');
    } finally {
      setIsDialogBusy(false);
    }
  }

  async function deleteAnnotation(annotationId: string) {
    if (!selectedAssistant) return;
    try { setData(await difyApiClient.deleteAnnotation({ assistantId: selectedAssistant.id, annotationId })); setNotice('标注已删除'); }
    catch (err) { setError(err instanceof Error ? err.message : '标注删除失败。'); }
  }

  async function submitHitl(message: Message, inputs: Record<string, string>, action: string) {
    try { setData(await difyApiClient.submitHitl({ messageId: message.id, inputs, action })); setNotice('人工处理已提交，工作流后续结果已更新'); }
    catch (err) { setError(err instanceof Error ? err.message : '人工处理提交失败。'); throw err; }
  }

  // 发送消息：先在前端乐观显示用户问题，再等待 Main 返回最新数据。
  async function sendMessage(queryOverride?: string) {
    const query = (queryOverride ?? input).trim();

    if (isSending || !selectedAssistant || !selectedConversation || (!query && selectedAssistant.mode !== 'workflow') || !requiredInputsReady) {
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
      content: query || '运行工作流',
      attachments: pendingFiles,
      createdAt: new Date().toISOString(),
      status: 'ok',
    };

    setData((current) => ({
      ...current,
      messages: [...current.messages, optimisticUserMessage],
    }));

    try {
      // 真正的 Dify 请求发生在 Electron Main 里，不在 React 里。
      const nextData = await difyApiClient.sendMessage({
        assistantId: selectedAssistant.id,
        conversationId: selectedConversation.id,
        query,
        streamId,
        inputs: conversationInputs,
        files: pendingFiles,
      });
      setData(nextData);
      setPendingFiles([]);
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
      <Sidebar activeView={activeView} onChangeView={setActiveView} />

      {activeView === 'settings' && (
        <section className="settings-workspace" aria-label="设置界面">
          <header className="workspace-header">
            <div>
              <h1>设置</h1>
              <p>
                {activeSettingsSection === 'translation'
                  ? '翻译 Web'
                  : isCreatingAssistant ? '新增助手' : selectedAssistant?.name || '选择或新建一个助手配置'}
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
                      setIsCreatingAssistant(false);
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
                    名称（可选）
                    <input
                      value={assistantForm.name}
                      placeholder="留空则自动读取 Dify 应用名称"
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
                  <label>
                    应用类型
                    <select value={assistantForm.mode} onChange={(event) => setAssistantForm((current) => ({ ...current, mode: event.target.value as DifyAppMode }))}>
                      <option value="chat">聊天助手</option>
                      <option value="advanced-chat">Chatflow</option>
                      <option value="agent-chat">Agent</option>
                      <option value="workflow">Workflow</option>
                      <option value="completion">文本生成</option>
                    </select>
                  </label>
                </div>

                <div className="settings-actions">
                  <button className="save-button" type="button" onClick={saveAssistant} disabled={isSaving}>
                    {isSaving ? <Check size={17} /> : <Save size={17} />}
                    {isCreatingAssistant ? '新增助手' : '保存助手配置'}
                  </button>
                  {selectedAssistant ? <button className="secondary-action" type="button" onClick={() => void refreshAssistant()} disabled={isSaving}><RefreshCw size={17} />重新同步</button> : null}
                </div>
                {selectedAssistant?.capabilities?.loaded ? <div className="capability-summary">
                  <strong>已识别能力</strong>
                  <span>{selectedAssistant.mode}</span>
                  <span>输入参数 {selectedAssistant.capabilities.inputFields.length} 个</span>
                  <span>{selectedAssistant.capabilities.supportsFileUpload ? '支持文件上传' : '无文件上传'}</span>
                  <span>{selectedAssistant.capabilities.supportsHitl ? '支持 HITL' : ''}</span>
                </div> : null}
                {selectedAssistant ? <details className="annotation-manager">
                  <summary>质量标注（{data.annotations.filter((item) => item.assistantId === selectedAssistant.id).length}）</summary>
                  {data.annotations.filter((item) => item.assistantId === selectedAssistant.id).map((annotation) => <article key={annotation.id}>
                    <div><strong>问：</strong>{annotation.question}</div><div><strong>答：</strong>{annotation.answer}</div>
                    <button type="button" onClick={() => void deleteAnnotation(annotation.id)}><Trash2 size={14} />删除</button>
                  </article>)}
                  {!data.annotations.some((item) => item.assistantId === selectedAssistant.id) ? <p>暂无标注，可在 AI 回复下方创建。</p> : null}
                </details> : null}
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
              <div className="pane-title-row">
                <h2>会话</h2>
                <div className="pane-header-actions">
                  <button className="icon-button" type="button" title="新会话" onClick={createConversation}>
                    <MessageSquarePlus size={18} />
                  </button>
                </div>
              </div>
              <AssistantPicker
                assistants={data.assistants}
                value={selectedAssistantId}
                syncError={assistantSyncStatus || undefined}
                onChange={(assistantId) => {
                  setSelectedAssistantId(assistantId);
                  setSelectedConversationId('');
                }}
              />
            </div>

            <div className="conversation-list">
              {conversations.map((conversation) => (
                <button
                  className={`conversation-item ${conversation.id === selectedConversationId ? 'active' : ''}`}
                  key={conversation.id}
                  type="button"
                  title={conversation.title}
                  aria-label={`${conversation.title}，更新于 ${formatTime(conversation.updatedAt)}`}
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
                <h2 title={selectedConversation?.title || '聊天窗口'}>{selectedConversation?.title || '聊天窗口'}</h2>
                <p>{selectedConversation?.difyConversationId ? `已连接 ${activeAssistantName} 上下文` : '本地新会话'}</p>
              </div>
              {selectedConversation && (
                <div className="chat-header-actions"><button className="icon-button secondary-icon" type="button" title="重命名会话" onClick={() => void renameConversation()}><Pencil size={17} /></button><button
                  className="danger-button"
                  type="button"
                  title="删除会话"
                  onClick={() => deleteConversation(selectedConversation.id)}
                >
                  <Trash2 size={18} />
                </button></div>
              )}
            </header>

            <div className="messages-shell">
            <div className="messages" ref={messagesRef} onScroll={handleMessagesScroll}>
              {messages.length === 0 && (
                <div className="welcome">
                  <Bot size={30} />
                  <h3>开始和 {selectedAssistant?.name || '助手'} 对话</h3>
                  {selectedAssistant?.description ? <p>{selectedAssistant.description}</p> : null}
                  {capabilities?.openingStatement ? <MarkdownMessage content={capabilities.openingStatement} /> : null}
                  <SuggestedQuestions questions={capabilities?.openingSuggestedQuestions} disabled={isSending || !selectedConversation} onSelectQuestion={(question) => void sendMessage(question)} />
                </div>
              )}

              {messages.map((message) => (
                <article className={`message ${message.role}`} key={message.id}>
                  <div className="avatar" aria-hidden="true">
                    {message.role === 'assistant' ? <Bot size={18} /> : <UserRound size={18} />}
                  </div>
                  <div className={`bubble ${message.status === 'error' ? 'error' : ''}`}>
                    <MessageTraces traces={message.traces} />
                    <MarkdownMessage content={message.content} onDownloadFile={(url, filename) => void downloadFile(url, filename)} />
                    <MessageAttachments
                      attachments={message.attachments}
                      formatFileSize={formatFileSize}
                      onDownloadFile={(url, filename) => void downloadFile(url, filename)}
                    />
                    <MessageCitations citations={message.citations} />
                    {message.hitl ? <HitlForm hitl={message.hitl} disabled={isSending} onSubmit={(inputs, action) => submitHitl(message, inputs, action)} /> : null}
                    {message.role === 'assistant' ? (
                      <SuggestedQuestions
                        questions={message.suggestedQuestions}
                        disabled={isSending || !selectedConversation}
                        onSelectQuestion={(question) => void sendMessage(question)}
                      />
                    ) : null}
                    <MessageFeedback message={message} onFeedback={(target, rating) => void sendFeedback(target, rating)} />
                    {message.role === 'assistant' && message.status !== 'error' ? <MessageActions message={message} onRegenerate={() => {
                      const index = messages.findIndex((item) => item.id === message.id);
                      const question = [...messages.slice(0, index)].reverse().find((item) => item.role === 'user')?.content;
                      if (question) void sendMessage(question);
                    }} onAnnotate={(answer) => void createAnnotation(message, answer)} /> : null}
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
            </div>

            {renderStatusBanner()}

            <CapabilityInputs fields={capabilities?.inputFields || []} values={conversationInputs} disabled={isSending} onChange={setConversationInputs} onUpload={uploadFile} />

            <MessageComposer
              inputRef={inputRef}
              value={input}
              isSending={isSending}
              canSend={canSend}
              disabled={!selectedConversation}
              mode={selectedAssistant?.mode}
              allowUpload={Boolean(capabilities?.supportsFileUpload)}
              files={pendingFiles}
              uploading={isUploading}
              accept={buildFileAccept(capabilities?.fileUpload.allowedFileExtensions, capabilities?.fileUpload.allowedFileTypes)}
              onChange={setInput}
              onSend={() => void sendMessage()}
              onStop={() => void stopCurrentMessage()}
              onChooseFiles={(files) => void chooseFiles(files)}
              onRemoveFile={(id) => setPendingFiles((current) => current.filter((file) => file.id !== id))}
            />
          </section>
        </section>
      )}

      {activeView === 'translate' && <TranslateWorkspace translationWebSrc={translationWebSrc} />}

      {pendingDialog ? (
        <ActionDialog
          title={pendingDialog.title}
          description={pendingDialog.description}
          confirmText={pendingDialog.confirmText}
          fields={pendingDialog.fields}
          busy={isDialogBusy}
          onChange={(name, value) => setPendingDialog((current) => current ? {
            ...current,
            fields: current.fields.map((field) => field.name === name ? { ...field, value } : field),
          } : null)}
          onCancel={() => setPendingDialog(null)}
          onConfirm={() => void confirmDialog()}
        />
      ) : null}
    </main>
  );
}

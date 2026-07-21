import { useEffect, useMemo, useRef, useState } from 'react';
import type { Message, MessageAttachment, MessageFeedbackRating, PublicAppData } from '../shared/types/app';
import type { Citation } from '../shared/types/citation';
import { SourceViewer } from './components/citations/SourceViewer';
import { Sidebar, type ActiveView } from './components/layout/Sidebar';
import { ActionDialog, type ActionDialogField } from './components/shared/ActionDialog';
import { AssistantSettingsView } from './features/assistants/AssistantSettingsView';
import type { AssistantForm } from './features/assistants/types';
import { ChatPane } from './features/chat/ChatPane';
import { ConversationSidebar } from './features/conversations/ConversationSidebar';
import { useMessageStreaming } from './hooks/useMessageStreaming';
import { useScrollToBottom } from './hooks/useScrollToBottom';
import { useStatusMessage } from './hooks/useStatusMessage';
import { difyApiClient } from './services/difyApiClient';

type PendingDialog = {
  kind: 'rename' | 'delete-conversation' | 'dislike' | 'annotation' | 'settings-login';
  title: string;
  description?: string;
  confirmText: string;
  message?: Message;
  conversationId?: string;
  fields: ActionDialogField[];
};

// React 启动时的空数据，真正数据会从 Electron Main 读取。
const emptyData: PublicAppData = {
  schemaVersion: 3,
  assistants: [],
  conversations: [],
  messages: [],
  annotations: [],
};

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
  const [data, setData] = useState<PublicAppData>(emptyData);

  // 当前选中的助手 ID 和会话 ID。
  const [selectedAssistantId, setSelectedAssistantId] = useState('');
  const [isCreatingAssistant, setIsCreatingAssistant] = useState(false);
  const [selectedConversationId, setSelectedConversationId] = useState('');
  const [activeView, setActiveView] = useState<ActiveView>('chat');

  // 左侧助手配置表单。
  const [assistantForm, setAssistantForm] = useState<AssistantForm>({
    name: '',
    apiBaseUrl: '',
    apiKey: '',
    userId: '',
    mode: 'chat',
  });
  const [input, setInput] = useState('');
  const [conversationInputs, setConversationInputs] = useState<Record<string, unknown>>({});
  const [pendingFiles, setPendingFiles] = useState<MessageAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingDialog, setPendingDialog] = useState<PendingDialog | null>(null);
  const [isDialogBusy, setIsDialogBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [settingsUnlocked, setSettingsUnlocked] = useState(false);
  const [sourceCitation, setSourceCitation] = useState<Citation | null>(null);
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
  const requiredInputsReady = (capabilities?.inputFields || []).every(
    (field) => !field.required
      || (conversationInputs[field.variable] !== undefined && conversationInputs[field.variable] !== ''),
  );
  const canSend = Boolean(
    selectedAssistant
      && selectedConversation
      && (input.trim() || selectedAssistant.mode === 'workflow')
      && requiredInputsReady,
  ) && !isSending && !isUploading;
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

  function changeView(view: ActiveView) {
    if (view !== 'settings' || settingsUnlocked) {
      setActiveView(view);
      return;
    }

    setDialogError('');
    setPendingDialog({
      kind: 'settings-login',
      title: '验证设置密码',
      description: '设置中包含 Dify API Key 等敏感配置，请输入密码后继续。',
      confirmText: '进入设置',
      fields: [{ name: 'password', label: '登录密码', value: '', inputType: 'password', required: true }],
    });
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
    try {
      setData(await difyApiClient.refreshAssistant(selectedAssistant.id));
      setNotice('应用能力和参数已刷新');
      setAssistantSyncStatus('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '应用信息刷新失败。');
      setAssistantSyncStatus('应用信息同步失败');
    } finally {
      setIsSaving(false);
    }
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
    setIsUploading(true);
    setError('');
    try {
      const limit = capabilities?.fileUpload.numberLimits || files.length;
      const uploaded = await Promise.all(files.slice(0, Math.max(0, limit - pendingFiles.length)).map(uploadFile));
      setPendingFiles((current) => [...current, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '文件上传失败。');
    } finally {
      setIsUploading(false);
    }
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
    setDialogError('');
    setError('');

    try {
      if (pendingDialog.kind === 'settings-login') {
        const verified = await difyApiClient.verifySettingsPassword({ password: values.password || '' });
        if (!verified) {
          setDialogError('密码错误，请重新输入。');
          return;
        }
        setSettingsUnlocked(true);
        setActiveView('settings');
      } else if (pendingDialog.kind === 'rename' && selectedConversation) {
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
    try {
      setData(await difyApiClient.deleteAnnotation({ assistantId: selectedAssistant.id, annotationId }));
      setNotice('标注已删除');
    } catch (err) {
      setError(err instanceof Error ? err.message : '标注删除失败。');
    }
  }

  async function submitHitl(message: Message, inputs: Record<string, string>, action: string) {
    try {
      setData(await difyApiClient.submitHitl({ messageId: message.id, inputs, action }));
      setNotice('人工处理已提交，工作流后续结果已更新');
    } catch (err) {
      setError(err instanceof Error ? err.message : '人工处理提交失败。');
      throw err;
    }
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

  function editUserMessage(message: Message) {
    setInput(message.content);
    setNotice('消息内容已放回输入框，修改后可重新发送');
    requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(message.content.length, message.content.length);
      inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }

  return (
    <main className="app-shell">
      <Sidebar activeView={activeView} onChangeView={changeView} />

      {activeView === 'settings' ? (
        <AssistantSettingsView
          assistants={data.assistants}
          annotations={data.annotations}
          selectedAssistant={selectedAssistant}
          selectedAssistantId={selectedAssistantId}
          form={assistantForm}
          isCreating={isCreatingAssistant}
          isSaving={isSaving}
          notice={notice}
          error={error}
          onCreateDraft={createAssistantDraft}
          onSelectAssistant={(assistantId) => {
            setIsCreatingAssistant(false);
            setSelectedAssistantId(assistantId);
          }}
          onChangeForm={setAssistantForm}
          onSave={() => void saveAssistant()}
          onRefresh={() => void refreshAssistant()}
          onDeleteAnnotation={(annotationId) => void deleteAnnotation(annotationId)}
          onCloseStatus={clearStatus}
        />
      ) : null}

      {activeView === 'chat' ? (
        <section className="chat-workspace" aria-label="会话界面">
          <ConversationSidebar
            assistants={data.assistants}
            conversations={conversations}
            selectedAssistantId={selectedAssistantId}
            selectedConversationId={selectedConversationId}
            syncError={assistantSyncStatus || undefined}
            onSelectAssistant={(assistantId) => {
              setSelectedAssistantId(assistantId);
              setSelectedConversationId('');
            }}
            onSelectConversation={setSelectedConversationId}
            onCreateConversation={() => void createConversation()}
          />
          <ChatPane
            selectedAssistant={selectedAssistant}
            selectedConversation={selectedConversation}
            messages={messages}
            input={input}
            conversationInputs={conversationInputs}
            pendingFiles={pendingFiles}
            streamingContent={streamingContent}
            loadingDots={loadingDots}
            isSending={isSending}
            isUploading={isUploading}
            canSend={canSend}
            notice={notice}
            error={error}
            showScrollToBottom={showScrollToBottom}
            inputRef={inputRef}
            messagesRef={messagesRef}
            messagesEndRef={messagesEndRef}
            onMessagesScroll={handleMessagesScroll}
            onScrollToBottom={() => {
              shouldStickToBottomRef.current = true;
              setScrollToBottomVisibility(false);
              scrollMessagesToBottom();
            }}
            onRenameConversation={renameConversation}
            onDeleteConversation={deleteConversation}
            onSendMessage={(query) => void sendMessage(query)}
            onStopMessage={() => void stopCurrentMessage()}
            onChangeInput={setInput}
            onChangeConversationInputs={setConversationInputs}
            onChooseFiles={(files) => void chooseFiles(files)}
            onRemoveFile={(id) => setPendingFiles((current) => current.filter((file) => file.id !== id))}
            onUploadFile={uploadFile}
            onDownloadFile={(url, filename) => void downloadFile(url, filename)}
            onFeedback={(message, rating) => void sendFeedback(message, rating)}
            onSubmitHitl={submitHitl}
            onEditMessage={editUserMessage}
            onAnnotateMessage={createAnnotation}
            onViewSource={setSourceCitation}
            onCloseStatus={clearStatus}
          />
        </section>
      ) : null}

      {pendingDialog ? (
        <ActionDialog
          title={pendingDialog.title}
          description={pendingDialog.description}
          confirmText={pendingDialog.confirmText}
          fields={pendingDialog.fields}
          busy={isDialogBusy}
          error={dialogError}
          onChange={(name, value) => setPendingDialog((current) => current ? {
            ...current,
            fields: current.fields.map((field) => field.name === name ? { ...field, value } : field),
          } : null)}
          onCancel={() => { setPendingDialog(null); setDialogError(''); }}
          onConfirm={() => void confirmDialog()}
        />
      ) : null}

      {sourceCitation ? <SourceViewer citation={sourceCitation} onClose={() => setSourceCitation(null)} /> : null}
    </main>
  );
}

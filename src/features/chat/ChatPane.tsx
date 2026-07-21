import { Bot, Pencil, Trash2, UserRound } from 'lucide-react';
import type { RefObject } from 'react';
import type {
  Conversation,
  Message,
  MessageAttachment,
  MessageFeedbackRating,
  PublicAssistant,
} from '../../../shared/types/app';
import type { Citation } from '../../../shared/types/citation';
import { CapabilityInputs } from '../../components/chat/CapabilityInputs';
import { MessageAttachments } from '../../components/chat/MessageAttachments';
import { MessageComposer } from '../../components/chat/MessageComposer';
import { HitlForm, MessageActions, MessageTraces, UserMessageActions } from '../../components/chat/MessageDetails';
import { MessageFeedback } from '../../components/chat/MessageFeedback';
import { SelectionCopyPopup } from '../../components/chat/SelectionCopyPopup';
import { SuggestedQuestions } from '../../components/chat/SuggestedQuestions';
import { CitationList } from '../../components/citations/CitationList';
import { StatusBanner } from '../../components/layout/StatusBanner';
import { MarkdownMessage } from '../../components/markdown/MarkdownMessage';
import { buildFileAccept } from '../../utils/fileAccept';
import { formatFileSize, formatTime } from '../../utils/formatters';

type ChatPaneProps = {
  selectedAssistant?: PublicAssistant;
  selectedConversation?: Conversation;
  messages: Message[];
  input: string;
  conversationInputs: Record<string, unknown>;
  pendingFiles: MessageAttachment[];
  streamingContent: string;
  loadingDots: string;
  isSending: boolean;
  isUploading: boolean;
  canSend: boolean;
  notice: string;
  error: string;
  showScrollToBottom: boolean;
  inputRef: RefObject<HTMLTextAreaElement | null>;
  messagesRef: RefObject<HTMLDivElement | null>;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onMessagesScroll: () => void;
  onScrollToBottom: () => void;
  onRenameConversation: () => void;
  onDeleteConversation: (conversationId: string) => void;
  onSendMessage: (query?: string) => void;
  onStopMessage: () => void;
  onChangeInput: (value: string) => void;
  onChangeConversationInputs: (values: Record<string, unknown>) => void;
  onChooseFiles: (files: File[]) => void;
  onRemoveFile: (id: string) => void;
  onUploadFile: (file: File) => Promise<MessageAttachment>;
  onDownloadFile: (url: string, filename?: string) => void;
  onFeedback: (message: Message, rating: Exclude<MessageFeedbackRating, null>) => void;
  onSubmitHitl: (message: Message, inputs: Record<string, string>, action: string) => Promise<void>;
  onEditMessage: (message: Message) => void;
  onAnnotateMessage: (message: Message, answer: string) => void;
  onViewSource: (citation: Citation) => void;
  onCloseStatus: () => void;
};

/**
 * 负责当前聊天窗口的展示结构。App 提供状态和业务命令，本组件只决定
 * 当前会话如何显示，不直接调用 Electron IPC。
 */
export function ChatPane({
  selectedAssistant,
  selectedConversation,
  messages,
  input,
  conversationInputs,
  pendingFiles,
  streamingContent,
  loadingDots,
  isSending,
  isUploading,
  canSend,
  notice,
  error,
  showScrollToBottom,
  inputRef,
  messagesRef,
  messagesEndRef,
  onMessagesScroll,
  onScrollToBottom,
  onRenameConversation,
  onDeleteConversation,
  onSendMessage,
  onStopMessage,
  onChangeInput,
  onChangeConversationInputs,
  onChooseFiles,
  onRemoveFile,
  onUploadFile,
  onDownloadFile,
  onFeedback,
  onSubmitHitl,
  onEditMessage,
  onAnnotateMessage,
  onViewSource,
  onCloseStatus,
}: ChatPaneProps) {
  const capabilities = selectedAssistant?.capabilities;
  const activeAssistantName = selectedAssistant?.name || '助手';

  const regenerateMessage = (message: Message) => {
    const index = messages.findIndex((item) => item.id === message.id);
    const question = [...messages.slice(0, index)].reverse().find((item) => item.role === 'user')?.content;
    if (question) onSendMessage(question);
  };

  return (
    <section className="chat-pane" aria-label="聊天窗口">
      <header className="chat-header">
        <div>
          <h2 title={selectedConversation?.title || '聊天窗口'}>
            {selectedConversation?.title || '聊天窗口'}
          </h2>
          <p>
            {selectedConversation?.difyConversationId
              ? `已连接 ${activeAssistantName} 上下文`
              : '本地新会话'}
          </p>
        </div>
        {selectedConversation ? (
          <div className="chat-header-actions">
            <button
              className="icon-button secondary-icon"
              type="button"
              title="重命名会话"
              onClick={onRenameConversation}
            >
              <Pencil size={17} />
            </button>
            <button
              className="danger-button"
              type="button"
              title="删除会话"
              onClick={() => onDeleteConversation(selectedConversation.id)}
            >
              <Trash2 size={18} />
            </button>
          </div>
        ) : null}
      </header>

      <div className="messages-shell">
        <div className="messages" ref={messagesRef} onScroll={onMessagesScroll}>
          {!messages.length ? (
            <div className="welcome">
              <Bot size={30} />
              <h3>开始和 {activeAssistantName} 对话</h3>
              {selectedAssistant?.description ? <p>{selectedAssistant.description}</p> : null}
              {capabilities?.openingStatement ? (
                <MarkdownMessage content={capabilities.openingStatement} />
              ) : null}
              <SuggestedQuestions
                questions={capabilities?.openingSuggestedQuestions}
                disabled={isSending || !selectedConversation}
                onSelectQuestion={onSendMessage}
              />
            </div>
          ) : null}

          {messages.map((message) => (
            <article className={`message ${message.role}`} key={message.id}>
              <div className="avatar" aria-hidden="true">
                {message.role === 'assistant' ? <Bot size={18} /> : <UserRound size={18} />}
              </div>
              <div className={`bubble ${message.status === 'error' ? 'error' : ''}`}>
                <MessageTraces traces={message.traces} />
                <div className="message-copy-scope">
                  <MarkdownMessage content={message.content} onDownloadFile={onDownloadFile} />
                </div>
                <MessageAttachments
                  attachments={message.attachments}
                  formatFileSize={formatFileSize}
                  onDownloadFile={onDownloadFile}
                />
                <CitationList citations={message.citations} onViewSource={onViewSource} />
                {message.hitl ? (
                  <HitlForm
                    hitl={message.hitl}
                    disabled={isSending}
                    onSubmit={(inputs, action) => onSubmitHitl(message, inputs, action)}
                  />
                ) : null}
                {message.role === 'assistant' ? (
                  <SuggestedQuestions
                    questions={message.suggestedQuestions}
                    disabled={isSending || !selectedConversation}
                    onSelectQuestion={onSendMessage}
                  />
                ) : null}
                <MessageFeedback message={message} onFeedback={onFeedback} />
                {message.role === 'user' && message.status !== 'error' ? (
                  <UserMessageActions message={message} disabled={isSending} onEdit={onEditMessage} />
                ) : null}
                {message.role === 'assistant' && message.status !== 'error' ? (
                  <MessageActions
                    message={message}
                    onRegenerate={() => regenerateMessage(message)}
                    onAnnotate={(answer) => onAnnotateMessage(message, answer)}
                  />
                ) : null}
                <time>{formatTime(message.createdAt)}</time>
              </div>
            </article>
          ))}

          {isSending ? (
            <article className="message assistant">
              <div className="avatar" aria-hidden="true"><Bot size={18} /></div>
              <div className={`bubble ${streamingContent ? '' : 'muted'}`}>
                {streamingContent ? (
                  <MarkdownMessage content={streamingContent} onDownloadFile={onDownloadFile} />
                ) : `正在请求 ${activeAssistantName}${loadingDots}`}
              </div>
            </article>
          ) : null}

          <div ref={messagesEndRef} />
        </div>

        <SelectionCopyPopup />

        {showScrollToBottom ? (
          <button className="scroll-bottom-button" type="button" onClick={onScrollToBottom}>
            回到底部
          </button>
        ) : null}
      </div>

      <StatusBanner notice={notice} error={error} onClose={onCloseStatus} />

      <CapabilityInputs
        fields={capabilities?.inputFields || []}
        values={conversationInputs}
        disabled={isSending}
        onChange={onChangeConversationInputs}
        onUpload={onUploadFile}
      />

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
        accept={buildFileAccept(
          capabilities?.fileUpload.allowedFileExtensions,
          capabilities?.fileUpload.allowedFileTypes,
        )}
        onChange={onChangeInput}
        onSend={() => onSendMessage()}
        onStop={onStopMessage}
        onChooseFiles={onChooseFiles}
        onRemoveFile={onRemoveFile}
      />
    </section>
  );
}

import { MessageSquarePlus } from 'lucide-react';
import type { Conversation, PublicAssistant } from '../../../shared/types/app';
import { AssistantPicker } from '../../components/chat/AssistantPicker';
import { formatTime } from '../../utils/formatters';

type ConversationSidebarProps = {
  assistants: PublicAssistant[];
  conversations: Conversation[];
  selectedAssistantId: string;
  selectedConversationId: string;
  syncError?: string;
  onSelectAssistant: (assistantId: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onCreateConversation: () => void;
};

/** 会话导航独立于消息展示和输入区，修改列表时不会牵动聊天内容组件。 */
export function ConversationSidebar({
  assistants,
  conversations,
  selectedAssistantId,
  selectedConversationId,
  syncError,
  onSelectAssistant,
  onSelectConversation,
  onCreateConversation,
}: ConversationSidebarProps) {
  return (
    <aside className="conversations-pane">
      <div className="pane-header">
        <div className="pane-title-row">
          <h2>会话</h2>
          <div className="pane-header-actions">
            <button className="icon-button" type="button" title="新会话" onClick={onCreateConversation}>
              <MessageSquarePlus size={18} />
            </button>
          </div>
        </div>
        <AssistantPicker
          assistants={assistants}
          value={selectedAssistantId}
          syncError={syncError}
          onChange={onSelectAssistant}
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
            onClick={() => onSelectConversation(conversation.id)}
          >
            <span>{conversation.title}</span>
            <small>{formatTime(conversation.updatedAt)}</small>
          </button>
        ))}

        {!conversations.length ? (
          <div className="empty-state">
            <p>还没有会话</p>
            <button type="button" onClick={onCreateConversation}>创建第一个会话</button>
          </div>
        ) : null}
      </div>
    </aside>
  );
}

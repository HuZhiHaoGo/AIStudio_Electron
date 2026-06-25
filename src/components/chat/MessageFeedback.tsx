import { ThumbsDown, ThumbsUp } from 'lucide-react';
import type { Message, MessageFeedbackRating } from '../../../shared/types/app';

type MessageFeedbackProps = {
  message: Message;
  onFeedback: (message: Message, rating: Exclude<MessageFeedbackRating, null>) => void;
};

export function MessageFeedback({ message, onFeedback }: MessageFeedbackProps) {
  if (message.role !== 'assistant' || !message.difyMessageId || message.status === 'error') {
    return null;
  }

  return (
    <div className="message-feedback" aria-label="消息反馈">
      <button
        className={`feedback-button ${message.feedbackRating === 'like' ? 'active' : ''}`}
        type="button"
        title={message.feedbackRating === 'like' ? '撤销点赞' : '点赞'}
        onClick={() => onFeedback(message, 'like')}
      >
        <ThumbsUp size={15} />
        <span>有帮助</span>
      </button>
      <button
        className={`feedback-button ${message.feedbackRating === 'dislike' ? 'active dislike' : ''}`}
        type="button"
        title={message.feedbackRating === 'dislike' ? '撤销点踩' : '点踩'}
        onClick={() => onFeedback(message, 'dislike')}
      >
        <ThumbsDown size={15} />
        <span>需改进</span>
      </button>
    </div>
  );
}

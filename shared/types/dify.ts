import type { MessageAttachment } from './app';

export type DifyFile = {
  filename?: string;
  name?: string;
  mime_type?: string;
  size?: number;
  related_id?: string;
  url?: string | null;
  remote_url?: string | null;
};

export type DifyStreamEvent = {
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

export type SendToDifyResult = {
  answer: string;
  difyConversationId?: string;
  difyMessageId?: string;
  attachments: MessageAttachment[];
  suggestedQuestions: string[];
  canceled?: boolean;
};

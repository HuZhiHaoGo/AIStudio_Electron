import { registerAppHandlers } from './appHandlers';
import { registerConversationHandlers } from './conversationHandlers';
import { registerFileHandlers } from './fileHandlers';
import { registerMessageHandlers } from './messageHandlers';
import { registerRagflowHandlers } from './ragflowHandlers';

export function registerIpcHandlers() {
  registerAppHandlers();
  registerConversationHandlers();
  registerFileHandlers();
  registerMessageHandlers();
  registerRagflowHandlers();
}

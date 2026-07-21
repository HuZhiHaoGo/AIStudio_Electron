import type { DifyAppMode } from '../../../shared/types/app';

/** 助手设置页可编辑的表单字段；它不是主进程保存的完整助手配置。 */
export type AssistantForm = {
  name: string;
  apiBaseUrl: string;
  apiKey: string;
  userId: string;
  mode: DifyAppMode;
};

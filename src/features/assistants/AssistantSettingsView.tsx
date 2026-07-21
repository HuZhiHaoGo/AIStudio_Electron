import { Bot, Check, Plus, RefreshCw, Save, Settings, Trash2 } from 'lucide-react';
import type { Annotation, DifyAppMode, PublicAssistant } from '../../../shared/types/app';
import { StatusBanner } from '../../components/layout/StatusBanner';
import type { AssistantForm } from './types';

type AssistantSettingsViewProps = {
  assistants: PublicAssistant[];
  annotations: Annotation[];
  selectedAssistant?: PublicAssistant;
  selectedAssistantId: string;
  form: AssistantForm;
  isCreating: boolean;
  isSaving: boolean;
  notice: string;
  error: string;
  onCreateDraft: () => void;
  onSelectAssistant: (assistantId: string) => void;
  onChangeForm: (form: AssistantForm) => void;
  onSave: () => void;
  onRefresh: () => void;
  onDeleteAnnotation: (annotationId: string) => void;
  onCloseStatus: () => void;
};

/**
 * 只负责展示助手管理界面。读取和保存仍由 App 负责，因此本组件没有隐藏的
 * IPC 副作用，输入相同的 props 时会得到可预测的界面。
 */
export function AssistantSettingsView({
  assistants,
  annotations,
  selectedAssistant,
  selectedAssistantId,
  form,
  isCreating,
  isSaving,
  notice,
  error,
  onCreateDraft,
  onSelectAssistant,
  onChangeForm,
  onSave,
  onRefresh,
  onDeleteAnnotation,
  onCloseStatus,
}: AssistantSettingsViewProps) {
  const selectedAnnotations = selectedAssistant
    ? annotations.filter((item) => item.assistantId === selectedAssistant.id)
    : [];
  const changeField = <Key extends keyof AssistantForm>(key: Key, value: AssistantForm[Key]) => {
    onChangeForm({ ...form, [key]: value });
  };

  return (
    <section className="settings-workspace" aria-label="设置界面">
      <header className="workspace-header">
        <div>
          <h1>设置</h1>
          <p>{isCreating ? '新增助手' : selectedAssistant?.name || '选择或新建一个助手配置'}</p>
        </div>
        <button className="primary-action" type="button" onClick={onCreateDraft}>
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
            {assistants.map((assistant) => (
              <button
                className={`assistant-item ${assistant.id === selectedAssistantId ? 'active' : ''}`}
                key={assistant.id}
                type="button"
                onClick={() => onSelectAssistant(assistant.id)}
              >
                <Bot size={18} />
                <span>{assistant.name}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="settings-panels">
          <section className="settings-form-panel">
            <div className="section-title">
              <Settings size={17} />
              会话配置
            </div>
            <div className="settings-form-grid">
              <label>
                名称（可选）
                <input
                  value={form.name}
                  placeholder="留空则自动读取 Dify 应用名称"
                  onChange={(event) => changeField('name', event.target.value)}
                />
              </label>
              <label>
                Dify API 地址
                <input
                  value={form.apiBaseUrl}
                  placeholder="http://192.168.1.10/v1"
                  onChange={(event) => changeField('apiBaseUrl', event.target.value)}
                />
              </label>
              <label>
                API Key
                <input
                  value={form.apiKey}
                  placeholder={selectedAssistant?.apiKeyMasked || 'app-xxxxxxxx'}
                  type="password"
                  onChange={(event) => changeField('apiKey', event.target.value)}
                />
              </label>
              <label>
                用户 ID
                <input value={form.userId} onChange={(event) => changeField('userId', event.target.value)} />
              </label>
              <label>
                应用类型
                <select
                  value={form.mode}
                  onChange={(event) => changeField('mode', event.target.value as DifyAppMode)}
                >
                  <option value="chat">聊天助手</option>
                  <option value="advanced-chat">Chatflow</option>
                  <option value="agent-chat">Agent</option>
                  <option value="workflow">Workflow</option>
                  <option value="completion">文本生成</option>
                </select>
              </label>
            </div>

            <div className="settings-actions">
              <button className="save-button" type="button" onClick={onSave} disabled={isSaving}>
                {isSaving ? <Check size={17} /> : <Save size={17} />}
                {isCreating ? '新增助手' : '保存助手配置'}
              </button>
              {selectedAssistant ? (
                <button className="secondary-action" type="button" onClick={onRefresh} disabled={isSaving}>
                  <RefreshCw size={17} />
                  重新同步
                </button>
              ) : null}
            </div>

            {selectedAssistant?.capabilities?.loaded ? (
              <div className="capability-summary">
                <strong>已识别能力</strong>
                <span>{selectedAssistant.mode}</span>
                <span>输入参数 {selectedAssistant.capabilities.inputFields.length} 个</span>
                <span>{selectedAssistant.capabilities.supportsFileUpload ? '支持文件上传' : '无文件上传'}</span>
                <span>{selectedAssistant.capabilities.supportsHitl ? '支持 HITL' : ''}</span>
              </div>
            ) : null}

            {selectedAssistant ? (
              <details className="annotation-manager">
                <summary>质量标注（{selectedAnnotations.length}）</summary>
                {selectedAnnotations.map((annotation) => (
                  <article key={annotation.id}>
                    <div><strong>问：</strong>{annotation.question}</div>
                    <div><strong>答：</strong>{annotation.answer}</div>
                    <button type="button" onClick={() => onDeleteAnnotation(annotation.id)}>
                      <Trash2 size={14} />
                      删除
                    </button>
                  </article>
                ))}
                {!selectedAnnotations.length ? <p>暂无标注，可在 AI 回复下方创建。</p> : null}
              </details>
            ) : null}
          </section>

          <StatusBanner notice={notice} error={error} onClose={onCloseStatus} />
        </div>
      </div>
    </section>
  );
}

import { Check, Clock, Copy, Pencil, RefreshCw, Save } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { HitlRequest, Message, MessageCitation, MessageTrace } from '../../../shared/types/app';

export function MessageTraces({ traces }: { traces?: MessageTrace[] }) {
  if (!traces?.length) return null;
  return (
    <details className="message-details">
      <summary>运行过程（{traces.length}）</summary>
      <div className="trace-list">{traces.map((trace) => (
        <details key={trace.id} className={`trace-item ${trace.status}`}>
          <summary><span>{trace.status === 'success' ? '✓' : trace.status === 'failed' ? '!' : '…'}</span>{trace.title}</summary>
          {trace.content ? <pre>{trace.content}</pre> : null}
          {trace.metadata ? <pre>{JSON.stringify(trace.metadata, null, 2)}</pre> : null}
        </details>
      ))}</div>
    </details>
  );
}

export function MessageCitations({ citations }: { citations?: MessageCitation[] }) {
  if (!citations?.length) return null;
  return (
    <details className="message-details citations">
      <summary>知识库引用（{citations.length}）</summary>
      {citations.map((citation, index) => <blockquote key={`${citation.documentName}-${index}`}>
        <strong>{citation.documentName || citation.datasetName || `引用 ${index + 1}`}</strong>
        <p>{citation.content}</p>
        {citation.score !== undefined ? <small>检索分数 {(citation.score * 100).toFixed(1)}%</small> : null}
      </blockquote>)}
    </details>
  );
}

export function HitlForm({ hitl, disabled, onSubmit }: { hitl: HitlRequest; disabled: boolean; onSubmit: (inputs: Record<string, string>, action: string) => Promise<void> }) {
  const [values, setValues] = useState(hitl.defaultValues || {});
  const [submitting, setSubmitting] = useState(false);
  const [remaining, setRemaining] = useState(Math.max(0, hitl.expirationTime - Math.floor(Date.now() / 1000)));
  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(Math.max(0, hitl.expirationTime - Math.floor(Date.now() / 1000))), 1000);
    return () => window.clearInterval(timer);
  }, [hitl.expirationTime]);
  const expired = remaining <= 0;
  return <section className="hitl-card">
    <h4><Clock size={16} />人工介入</h4>
    <p>{hitl.formContent}</p>
    {hitl.inputs.map((field) => <label key={field.outputVariableName}>{field.outputVariableName}
      <input disabled={disabled || expired || submitting || hitl.submitted} required={field.required} value={values[field.outputVariableName] || ''} onChange={(event) => setValues((current) => ({ ...current, [field.outputVariableName]: event.target.value }))} />
    </label>)}
    <small>{hitl.submitted ? '已提交，工作流正在继续' : expired ? '已过期' : `剩余 ${Math.floor(remaining / 60)} 分 ${remaining % 60} 秒`}</small>
    <div>{(hitl.actions.length ? hitl.actions : [{ id: 'submit', title: '提交' }]).map((action) => <button key={action.id} disabled={disabled || expired || submitting || hitl.submitted} onClick={async () => { setSubmitting(true); try { await onSubmit(values, action.id); } finally { setSubmitting(false); } }}><Check size={15} />{action.title}</button>)}</div>
  </section>;
}

export function MessageActions({ message, onRegenerate, onAnnotate }: { message: Message; onRegenerate: () => void; onAnnotate: (answer: string) => void }) {
  const [copied, setCopied] = useState(false);
  const actions = useMemo(() => [
    { title: copied ? '已复制' : '复制', icon: copied ? <Check size={14} /> : <Copy size={14} />, run: async () => { await navigator.clipboard.writeText(message.content); setCopied(true); window.setTimeout(() => setCopied(false), 1200); } },
    { title: '重新生成', icon: <RefreshCw size={14} />, run: onRegenerate },
    { title: message.annotationId ? '已标注' : '创建标注', icon: message.annotationId ? <Check size={14} /> : <Save size={14} />, run: () => onAnnotate(message.content) },
  ], [copied, message.annotationId, message.content, onAnnotate, onRegenerate]);
  return <div className="message-actions">{actions.map((action) => <button key={action.title} type="button" onClick={() => void action.run()}>{action.icon}{action.title}</button>)}</div>;
}

export function UserMessageActions({ message, disabled, onEdit }: { message: Message; disabled?: boolean; onEdit: (message: Message) => void }) {
  const [copied, setCopied] = useState(false);
  async function copyContent() {
    await navigator.clipboard.writeText(message.content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  }
  return <div className="message-actions user-message-actions" aria-label="用户消息操作">
    <button type="button" disabled={disabled} title={copied ? '已复制' : '复制内容'} aria-label={copied ? '已复制' : '复制内容'} onClick={() => void copyContent()}>
      {copied ? <Check size={15} /> : <Copy size={15} />}
    </button>
    <button type="button" disabled={disabled} title="再次编辑" aria-label="再次编辑" onClick={() => onEdit(message)}>
      <Pencil size={15} />
    </button>
  </div>;
}

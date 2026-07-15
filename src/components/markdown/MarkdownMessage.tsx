import { memo, useEffect, useRef, useState } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import 'katex/dist/katex.min.css';

type Props = { content: string; onDownloadFile?: (url: string, filename?: string) => void };

function MermaidBlock({ source }: { source: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    void import('mermaid').then(({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: 'neutral' });
      return mermaid.render(`mermaid-${Math.random().toString(36).slice(2)}`, source);
    }).then(({ svg }) => {
      if (active && ref.current) ref.current.innerHTML = svg;
    }).catch((reason) => active && setError(reason instanceof Error ? reason.message : '图表渲染失败'));
    return () => { active = false; };
  }, [source]);
  return error ? <pre className="diagram-error">{error}{'\n'}{source}</pre> : <div className="mermaid-block" ref={ref} />;
}

function text(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(text).join('');
  return '';
}

const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), 'details', 'summary', 'video', 'source'],
  attributes: {
    ...defaultSchema.attributes,
    video: ['src', 'controls', 'poster', 'width', 'height'],
    source: ['src', 'type'],
    details: ['open'],
  },
  protocols: { ...defaultSchema.protocols, src: ['http', 'https', 'data'] },
};

export const MarkdownMessage = memo(function MarkdownMessage({ content, onDownloadFile }: Props) {
  const normalized = content.replace(/<think>/gi, '<details class="think-block"><summary>深度思考</summary>').replace(/<\/think>/gi, '</details>');
  const components: Components = {
    a: ({ children, href = '', ...props }) => <a {...props} href={href} target="_blank" rel="noreferrer" onClick={(event) => {
      if (href.includes('/files/') && onDownloadFile) { event.preventDefault(); onDownloadFile(href, text(children)); }
    }}>{children}</a>,
    img: ({ src, alt }) => src ? <img className="markdown-image" src={src} alt={alt || ''} loading="lazy" role="button" tabIndex={0} title="点击查看原图" onClick={() => window.open(src, '_blank')} onKeyDown={(event) => { if (event.key === 'Enter') window.open(src, '_blank'); }} /> : null,
    code: ({ className, children, ...props }) => {
      const language = /language-([^ ]+)/.exec(className || '')?.[1];
      const source = text(children).replace(/\n$/, '');
      if (language === 'mermaid') return <MermaidBlock source={source} />;
      const block = Boolean(className) || source.includes('\n');
      return block ? <div className="code-block"><button type="button" onClick={() => void navigator.clipboard.writeText(source)}>复制</button><code {...props} className={className}>{children}</code></div> : <code {...props}>{children}</code>;
    },
  };
  return <div className="markdown-body">
    <ReactMarkdown components={components} remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeRaw, [rehypeSanitize, schema], rehypeKatex]}>{normalized}</ReactMarkdown>
  </div>;
});

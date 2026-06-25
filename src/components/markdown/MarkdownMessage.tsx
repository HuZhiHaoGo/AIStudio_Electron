import { memo } from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';

type MarkdownMessageProps = {
  content: string;
  onDownloadFile?: (url: string, filename?: string) => void;
};

function getTextContent(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map(getTextContent).join('');
  }

  return '';
}

export const MarkdownMessage = memo(function MarkdownMessage({ content, onDownloadFile }: MarkdownMessageProps) {
  const markdownComponents: Components = {
    a: ({ node: _node, children, ...props }) => {
      const href = typeof props.href === 'string' ? props.href : '';
      const isDifyFile = href.includes('/files/');

      return (
        <a
          {...props}
          target="_blank"
          rel="noreferrer"
          onClick={(event) => {
            if (isDifyFile && onDownloadFile) {
              event.preventDefault();
              onDownloadFile(href, getTextContent(children));
            }
          }}
        >
          {children}
        </a>
      );
    },
  };

  return (
    <div className="markdown-body">
      <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  );
});

import { Languages } from 'lucide-react';

type TranslateWorkspaceProps = {
  translationWebSrc: string;
};

export function TranslateWorkspace({ translationWebSrc }: TranslateWorkspaceProps) {
  return (
    <section className="translate-workspace" aria-label="翻译平台">
      <header className="workspace-header">
        <div>
          <h1>翻译</h1>
          <p>{translationWebSrc || '翻译平台 Web 待配置'}</p>
        </div>
      </header>

      <div className="translation-web-shell">
        {translationWebSrc ? (
          <webview className="translation-frame" src={translationWebSrc} />
        ) : (
          <div className="translation-placeholder">
            <Languages size={34} />
            <h2>翻译平台</h2>
            <p>请先在设置中配置翻译 Web 地址。</p>
          </div>
        )}
      </div>
    </section>
  );
}

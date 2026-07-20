import { MessageSquare, Settings } from 'lucide-react';
import tbeaLogo from '../../LOGO/TBEA3.png';

export type ActiveView = 'chat' | 'settings';

type SidebarProps = {
  activeView: ActiveView;
  onChangeView: (view: ActiveView) => void;
};

export function Sidebar({ activeView, onChangeView }: SidebarProps) {
  return (
    <aside className="sidebar" aria-label="主导航">
      <div className="sidebar-brand">
        <img src={tbeaLogo} alt="匠宝Bot" />
      </div>

      <nav className="sidebar-nav">
        <button
          className={`sidebar-button ${activeView === 'chat' ? 'active' : ''}`}
          type="button"
          title="会话"
          onClick={() => onChangeView('chat')}
        >
          <MessageSquare size={22} />
          <span>会话</span>
        </button>
        <button
          className={`sidebar-button ${activeView === 'settings' ? 'active' : ''}`}
          type="button"
          title="设置"
          onClick={() => onChangeView('settings')}
        >
          <Settings size={22} />
          <span>设置</span>
        </button>
      </nav>
    </aside>
  );
}

import { Menu, type BrowserWindow, type MenuItemConstructorOptions } from 'electron';

/** Adds the standard desktop editing menu only to editable controls. */
export function installEditableContextMenu(win: BrowserWindow) {
  win.webContents.on('context-menu', (_event, params) => {
    if (!params.isEditable) return;
    const template: MenuItemConstructorOptions[] = [
      { label: '撤销', role: 'undo', enabled: params.editFlags.canUndo },
      { label: '重做', role: 'redo', enabled: params.editFlags.canRedo },
      { type: 'separator' },
      { label: '剪切', role: 'cut', enabled: params.editFlags.canCut },
      { label: '复制', role: 'copy', enabled: params.editFlags.canCopy },
      { label: '粘贴', role: 'paste', enabled: params.editFlags.canPaste },
      { type: 'separator' },
      { label: '全选', role: 'selectAll', enabled: params.editFlags.canSelectAll },
    ];
    Menu.buildFromTemplate(template).popup({ window: win });
  });
}

// 从 Electron 导入 BrowserWindow 和 shell：BrowserWindow 创建窗口，shell 调用系统能力打开外部链接。
import { BrowserWindow, shell } from 'electron';
// 导入 Node.js 的 path 模块：它能用跨平台方式拼接文件路径。
import path from 'node:path';
// 导入窗口图标路径函数：路径细节集中放在 windowPaths.ts 中维护。
import { windowIconPath } from './windowPaths';

// 定义 createWindow 接收的参数类型；type 是 TypeScript 语法，只用于类型检查。
type CreateWindowOptions = {
  // isDev 表示是否开发模式；boolean 只能是 true 或 false。
  isDev: boolean;
  // devServerUrl 是可选字符串；问号表示这个字段可以不存在。
  devServerUrl?: string;
};

// 导出 createWindow 函数：main.ts 会调用它创建应用主窗口。
export function createWindow({ isDev, devServerUrl }: CreateWindowOptions) {
  // 创建 BrowserWindow 实例；const 表示 win 这个变量不会被重新赋值。
  const win = new BrowserWindow({
    // 设置窗口初始宽度为 1320 像素。
    width: 1320,
    // 设置窗口初始高度为 820 像素。
    height: 820,
    // 设置窗口最小宽度，防止界面被缩到无法使用。
    minWidth: 1050,
    // 设置窗口最小高度，防止内容上下挤压严重。
    minHeight: 680,
    // 设置窗口标题，显示在系统窗口标题栏或任务栏中。
    title: '匠宝Bot',
    // 设置窗口图标；windowIconPath() 会根据开发/打包环境返回不同路径。
    icon: windowIconPath(),
    // 设置窗口加载页面前的背景色，避免白屏闪烁太突兀。
    backgroundColor: '#F4F8FF',
    // webPreferences 是 Electron 的网页环境配置。
    webPreferences: {
      // 指定 preload 脚本路径；__dirname 是当前编译后 JS 文件所在目录。
      preload: path.join(__dirname, '../preload.js'),
      // 开启上下文隔离：网页 JS 和 preload JS 不在同一个全局对象里，安全性更好。
      contextIsolation: true,
      // 禁止网页直接使用 Node.js；React 页面不能随便读写本地文件。
      nodeIntegration: false,
      // 允许使用 webview 标签；项目的翻译页面需要嵌入外部网页。
      webviewTag: true,
    },
  });

  // 监听窗口网页内容的键盘事件；before-input-event 发生在页面处理按键之前。
  win.webContents.on('before-input-event', (event, input) => {
    // 判断是否按下 Ctrl + Shift + I；input 描述本次键盘输入。
    if (input.type === 'keyDown' && input.control && input.shift && input.key.toLowerCase() === 'i') {
      // 切换开发者工具显示状态，方便开发者调试页面。
      win.webContents.toggleDevTools();
      // 阻止这个快捷键继续传给网页，避免页面也响应同一个快捷键。
      event.preventDefault();
    }
  });

  // 设置新窗口打开处理器；网页中 target=_blank 或 window.open 会经过这里。
  win.webContents.setWindowOpenHandler(({ url }) => {
    // 用正则判断 URL 是否以 http:// 或 https:// 开头；i 表示忽略大小写。
    if (/^https?:\/\//i.test(url)) {
      // 用系统默认浏览器打开外部链接；void 表示我们不等待这个 Promise。
      void shell.openExternal(url);
    }

    // 拒绝 Electron 在应用内部新开窗口，避免出现不受控的窗口。
    return { action: 'deny' };
  });

  // 如果是开发模式并且有 Vite 地址，就加载开发服务器页面。
  if (isDev && devServerUrl) {
    // loadURL 加载网络地址；开发时 Vite 会提供热更新能力。
    void win.loadURL(devServerUrl);
    // 返回窗口实例，调用方如果需要可以继续操作它。
    return win;
  }

  // 生产模式加载打包后的 index.html；路径指向 dist 目录。
  void win.loadFile(path.join(__dirname, '../../../dist/index.html'));
  // 返回窗口实例。
  return win;
}

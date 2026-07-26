const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 900,
    show: false, // 준비될 때까지 화면을 숨겨둠 (흰 화면 튀김 방지)
    autoHideMenuBar: true, // Alt키 누를 때만 메뉴바 표시 (완전 제거 시 Menu.setApplicationMenu(null))
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // 메뉴바 완전 제거를 원할 경우 아래 주석 해제
  // Menu.setApplicationMenu(null);

  win.loadFile('index.html');

  // 화면 준비가 끝나면 깔끔하게 표시
  win.once('ready-to-show', () => {
    win.show();
  });

  // target="_blank" 링크(광고 등 외부 URL) 클릭 시 기본 브라우저로 열기
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
      return { action: 'deny' }; // 일렉트론 내부 새 창 열기 거부
    }
    return { action: 'allow' };
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

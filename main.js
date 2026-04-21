const { app, Tray, Menu, shell, Notification, nativeImage } = require('electron');
const next = require('next');
const http = require('http');
const path = require('path');
const fs = require('fs');

const dev = !app.isPackaged;
const port = 3000;
const hostname = '0.0.0.0';

let tray = null;
let nextServer = null;

// Prevent multiple instances
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

async function startNextServer() {
  const nextApp = next({ dev, hostname, port, dir: __dirname });
  const handle = nextApp.getRequestHandler();

  await nextApp.prepare();

  nextServer = http.createServer((req, res) => {
    handle(req, res);
  }).listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    if (app.isPackaged) {
      try {
        new Notification({
          title: 'PControl Started',
          body: `Server is running at http://${hostname}:${port}`,
        }).show();
      } catch (e) {
        console.error('Notification failed', e);
      }
    }
  });
}

function createTray() {
  const iconPaths = [
    path.join(__dirname, 'public', 'icon.png'),
    path.join(__dirname, 'public', 'icon.ico')
  ];
  
  let loaded = false;
  for (const iconPath of iconPaths) {
    if (fs.existsSync(iconPath)) {
      try {
        const image = nativeImage.createFromPath(iconPath);
        if (!image.isEmpty()) {
          tray = new Tray(image.resize({ width: 16, height: 16 }));
          loaded = true;
          console.log('Tray icon loaded from:', iconPath);
          break;
        }
      } catch (e) {
        console.error(`Failed to load tray icon from ${iconPath}`, e);
      }
    }
  }
  
  if (!loaded) {
    console.error('Tray icon not found or invalid.');
  }

  const contextMenu = Menu.buildFromTemplate([
    { label: 'PControl Dashboard', enabled: false },
    { type: 'separator' },
    {
      label: 'Open Dashboard',
      click: () => {
        shell.openExternal(`http://localhost:${port}`);
      }
    },
    {
      label: 'Start with Windows',
      type: 'checkbox',
      checked: app.getLoginItemSettings().openAtLogin,
      click: (item) => {
        app.setLoginItemSettings({
          openAtLogin: item.checked,
          path: app.getPath('exe')
        });
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  if (tray) {
    tray.setToolTip('PControl Server');
    tray.setContextMenu(contextMenu);
    
    tray.on('right-click', () => {
      tray.popUpContextMenu();
    });

    tray.on('double-click', () => {
      shell.openExternal(`http://localhost:${port}`);
    });
  }
}

app.whenReady().then(async () => {
  await startNextServer();
  createTray();
  
  if (process.platform === 'darwin' && app.dock) app.dock.hide();
});

app.on('window-all-closed', (e) => {
  e.preventDefault();
});

app.on('before-quit', () => {
  if (nextServer) nextServer.close();
});

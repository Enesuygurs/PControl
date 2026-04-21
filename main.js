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

// Load environment variables from .env file manually
function loadEnv() {
  const envPaths = [
    path.join(__dirname, '.env'), // Inside app resources
    path.join(path.dirname(app.getPath('exe')), '.env'), // Next to executable
  ];

  envPaths.forEach(envPath => {
    if (fs.existsSync(envPath)) {
      console.log(`Loading environment from: ${envPath}`);
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split(/\r?\n/).forEach(line => {
          const trimmedLine = line.trim();
          if (!trimmedLine || trimmedLine.startsWith('#')) return;
          
          const [key, ...valueParts] = trimmedLine.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim();
            // Don't override if already set in process.env (e.g. by system)
            if (!process.env[key.trim()]) {
              process.env[key.trim()] = value;
            } else if (envPath.includes(path.dirname(app.getPath('exe')))) {
              // But allow .env next to EXE to override internal defaults
              process.env[key.trim()] = value;
            }
          }
        });
      } catch (e) {
        console.error(`Failed to read .env from ${envPath}`, e);
      }
    }
  });
}

loadEnv();

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

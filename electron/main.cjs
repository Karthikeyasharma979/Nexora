const { app, BrowserWindow, globalShortcut, desktopCapturer } = require('electron');
const path = require('path');

let mainWindow;
let splashWindow;

function createWindow() {
  const startTime = Date.now();

  splashWindow = new BrowserWindow({
    width: 500,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    show: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));

  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    kiosk: true,         // Takes over entire screen
    alwaysOnTop: true,   // Prevents other apps from appearing above
    frame: false,        // Removes standard window controls (X, minimize, maximize)
    show: false,         // Hide initially while splash screen is visible
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: process.env.NODE_ENV === 'development' // Disable DevTools in production
    }
  });

  // Intercept and prevent "Right Click" context menu globally
  mainWindow.hookWindowMessage(278, function (e) {
    mainWindow.setEnabled(false);
    setTimeout(() => {
      mainWindow.setEnabled(true);
    }, 100);
    return true;
  });

  // Aggressive Kiosk Enforcement: Steal focus back immediately if lost
  // This prevents 3-finger swipes (Task View) or Alt+Tab from keeping focus
  mainWindow.on('blur', () => {
    if (mainWindow) {
      mainWindow.focus();
    }
  });

  // Elevate window level to 'screen-saver' to block Task View overlays on Windows
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  // Remove the default menu bar
  mainWindow.setMenu(null);

  // Automatically grant screen sharing permissions for the exam monitor (Diagnostics)
  mainWindow.webContents.session.setDisplayMediaRequestHandler((request, callback) => {
    desktopCapturer.getSources({ types: ['screen'] }).then((sources) => {
      // Grant access to the first screen found automatically
      callback({ video: sources[0] });
    }).catch((err) => {
      console.log('Error getting screen sources', err);
    });
  });

  const isDev = !app.isPackaged;
  
  const hasCustomUrl = process.argv.some(arg => arg.startsWith('nexora://'));

  if (!hasCustomUrl) {
    if (isDev) {
      // In development, load the Vite dev server to the kiosk login route
      mainWindow.loadURL('http://localhost:5173/kiosk-login');
    } else {
      // In production, load the built static files and append the hash route
      mainWindow.loadURL(`file://${path.join(__dirname, '../dist/index.html')}#/kiosk-login`);
    }
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle splash screen to main window transition
  mainWindow.webContents.once('did-finish-load', () => {
    const elapsed = Date.now() - startTime;
    const minSplashTime = 2500;
    const remainingTime = Math.max(0, minSplashTime - elapsed);
    
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.webContents.send('app-ready');
      }
      setTimeout(() => {
        if (splashWindow && !splashWindow.isDestroyed()) {
          splashWindow.close();
          splashWindow = null;
        }
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.show();
          mainWindow.focus();
        }
      }, 500); // 500ms delay to let the progress bar hit 100%
    }, remainingTime);
  });

  // Fallback kill switch listener in case globalShortcut fails due to focus stealing
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.control && input.shift && input.key.toLowerCase() === 'q') {
      console.log('Kill switch activated via webContents');
      app.quit();
      event.preventDefault();
    }
  });
}

// Force register the protocol on Windows/Mac, even in development
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('nexora', process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient('nexora')
}

// Check for deep links on Windows (second-instance logic)
const gotTheLock = app.requestSingleInstanceLock()
if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    // Someone tried to run a second instance, we should focus our window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
    // Handle the custom protocol URL on Windows
    const url = commandLine.find(arg => arg.startsWith('nexora://'));
    if (url && mainWindow) {
      handleCustomUrl(url);
    }
  })
}

function handleCustomUrl(url) {
  // Strip the protocol robustly (Windows can be weird with slashes)
  let urlPath = url.replace(/^nexora:\/\/?/, '/');
  
  // Ensure it starts with exactly one slash
  urlPath = urlPath.replace(/^\/+/, '/');
  
  // Windows automatically appends a trailing slash to protocol links (e.g., nexora://test/1/)
  if (urlPath.endsWith('/')) {
    urlPath = urlPath.slice(0, -1);
  }
  
  // Also pass the URL as a query param just in case we need to debug it inside React
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL(`http://localhost:5173${urlPath}?rawUrl=${encodeURIComponent(url)}`);
  } else {
    mainWindow.loadURL(`file://${path.join(__dirname, '../dist/index.html')}#${urlPath}?rawUrl=${encodeURIComponent(url)}`);
  }
}

app.on('ready', () => {
  createWindow();

  // Handle URL on startup (Windows/Mac)
  const urlArg = process.argv.find(arg => arg.startsWith('nexora://'));
  if (urlArg) {
    handleCustomUrl(urlArg);
  }

  // SECURE EXAM FEATURES: Hook and disable common shortcuts

  // 1. Prevent Alt+Tab / Ctrl+Esc equivalent by strictly capturing them if possible,
  // Note: True OS-level hooks require native modules, but kiosk mode handles most of this.
  globalShortcut.register('Alt+Tab', () => {
    if (mainWindow) mainWindow.focus();
  });
  globalShortcut.register('Super+Tab', () => {
    if (mainWindow) mainWindow.focus();
  });

  // 2. Secret Dev Kill Switch (Ctrl+Shift+Q) to close the app during development
  globalShortcut.register('CommandOrControl+Shift+Q', () => {
    app.quit();
  });

  // 3. Disable refreshing (F5, Ctrl+R)
  globalShortcut.register('F5', () => {
    console.log('Refresh blocked');
  });
  globalShortcut.register('CommandOrControl+R', () => {
    console.log('Refresh blocked');
  });

  // 4. Disable Print Screen (Windows/Linux only)
  globalShortcut.register('PrintScreen', () => {
    console.log('Screenshot blocked');
  });

  // 5. Disable App Closing shortcuts (except kill switch)
  globalShortcut.register('Alt+F4', () => {
    console.log('Alt+F4 blocked');
  });
  globalShortcut.register('CommandOrControl+W', () => {
    console.log('Close window blocked');
  });

  // 6. Disable DevTools shortcuts manually just in case
  globalShortcut.register('F12', () => {
    console.log('DevTools blocked');
  });
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    console.log('DevTools blocked');
  });
});

// Unregister shortcuts when the app is quitting
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

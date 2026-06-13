const { app, BrowserWindow, globalShortcut, desktopCapturer, screen, ipcMain, dialog } = require('electron');
// Guard: if this file is executed with plain `node` (e.g., via nodemon), the Electron
// APIs will be undefined and cause confusing TypeErrors like "Cannot read properties
// of undefined (reading 'on')". Exit early with a clear message to avoid crashes.
if (!app || typeof app.on !== 'function') {
  console.error('This script must be run with the Electron runtime, not plain Node.');
  console.error('Start the app with the `electron` command or via your npm start script.');
  process.exit(1);
}
const path = require('path');
const { exec, execSync } = require('child_process');

// --- SCORCHED EARTH WHITELIST ---
// Only these critical system applications are allowed to have open windows during the exam.
// Everything else on the computer will be forcefully terminated.
const WHITELIST_APPS = [
  'explorer',                   // Windows Taskbar & Desktop
  'Taskmgr',                    // Task Manager (even though we disable it)
  'cmd',                        // Command Prompt
  'powershell',                 // PowerShell
  'SearchApp',                  // Windows Search
  'StartMenuExperienceHost',    // Windows Start Menu
  'ShellExperienceHost',        // Windows UI
  'TextInputHost',              // Touch Keyboard/Emoji Panel
  'Code',                       // VS Code (for development only)
  'nexora-secure-browser',      // Our own app
  'electron'                    // Electron dev host
];

function detectCompromisedEnvironment() {
  return new Promise((resolve) => {
    if (process.platform === 'win32') {
      const psScript = `
        $reasons = @()
        
        $system = Get-WmiObject Win32_ComputerSystem
        $manufacturer = $system.Manufacturer.ToLower()
        $model = $system.Model.ToLower()
        
        if ($manufacturer -match "vmware" -or $manufacturer -match "innotek" -or $manufacturer -match "qemu" -or $manufacturer -match "oracle" -or $model -match "virtual machine" -or $model -match "virtualbox") {
          $reasons += "Virtual Machine detected ($manufacturer / $model)"
        }
        
        if ($env:SESSIONNAME -match "RDP") {
          $reasons += "Remote Desktop Session (RDP Variable)"
        }
        
        try {
          $rdpSessions = qwinsta | Where-Object { $_ -match 'rdp-tcp#' -and $_ -match 'Active' }
          if ($rdpSessions) {
            $reasons += "Active Remote Desktop Connection"
          }
        } catch {}
        
        if ($reasons.Count -gt 0) {
          Write-Output "COMPROMISED: $($reasons -join ' | ')"
        } else {
          Write-Output "CLEAN"
        }
      `;
      
      const encodedScript = Buffer.from(psScript, 'utf16le').toString('base64');
      exec(`powershell.exe -NoProfile -EncodedCommand ${encodedScript}`, (err, stdout) => {
        const result = stdout ? stdout.trim() : '';
        if (result.startsWith("COMPROMISED:")) {
          resolve(result.replace("COMPROMISED: ", ""));
        } else {
          resolve(null);
        }
      });
    } else {
      resolve(null);
    }
  });
}

function sanitizeEnvironment(isStartup = false) {
  return new Promise(async (resolve) => {
    if (process.platform === 'win32') {
      // PROTECT DEVELOPERS: Only run the Scorched Earth nuke if the app is packaged (production).
      if (app.isPackaged) {
        
        if (isStartup) {
          const compromiseReason = await detectCompromisedEnvironment();
          if (compromiseReason) {
            const { dialog } = require('electron');
            dialog.showErrorBox(
              'Security Violation Detected',
              'Nexora Secure Browser cannot run in this environment.\\n\\nReason: ' + compromiseReason + '\\n\\nPlease run the exam on a physical machine without any active Remote Desktop sessions.'
            );
            app.quit();
            return resolve(); // Exit out
          }
        }

        const whitelistString = WHITELIST_APPS.map(app => `'${app}'`).join(',');
        
        if (isStartup) {
          // Step 1: Detect apps to warn user
          const psDetectScript = `
            $whitelist = @(${whitelistString})
            $myPid = ${process.pid}
            $badApps = Get-Process | Where-Object { 
              $_.MainWindowHandle -ne 0 -and 
              $whitelist -notcontains $_.Name -and 
              $_.Id -ne $myPid 
            }
            $badAppNames = @()
            if ($badApps.Count -gt 0) {
              $badAppNames += $badApps | Select-Object -ExpandProperty Name -Unique
            }
            if ((New-Object -ComObject Shell.Application).Windows().Count -gt 0) {
              $badAppNames += "File Explorer (Folders)"
            }
            if ($badAppNames.Count -gt 0) {
              $badAppNames | Select-Object -Unique
            }
          `;
          const encodedDetect = Buffer.from(psDetectScript, 'utf16le').toString('base64');
          
          exec(`powershell.exe -NoProfile -EncodedCommand ${encodedDetect}`, (err, stdout) => {
            const appsToKill = stdout.trim().split('\\n').map(s => s.trim()).filter(s => s.length > 0);
            
            if (appsToKill.length > 0) {
              const { dialog } = require('electron');
              const response = dialog.showMessageBoxSync({
                type: 'warning',
                buttons: ['Yes, Close Them', 'No, Exit (Save Work)'],
                title: 'Close Prohibited Applications',
                message: 'The Secure Browser requires all other applications to be closed.',
                detail: 'The following applications must be closed forcefully:\n\n' + appsToKill.join(', ') + '\n\nDo you want to close them now? (Unsaved work will be lost!)',
                noLink: true
              });
              
              if (response === 0) {
                executeScorchedEarth(whitelistString);
                resolve();
              } else {
                app.quit();
              }
            } else {
              resolve();
            }
          });
        } else {
          // Background loop silently kills apps that try to open during the test
          executeScorchedEarth(whitelistString);
          resolve();
        }
      } else {
        if (isStartup) console.log('[SECURE BROWSER] Dev Mode: Scorched Earth Sweep skipped to protect your workspace.');
        resolve();
      }
    } else {
      resolve();
    }
  });
}

function executeScorchedEarth(whitelistString) {
  // Safer behavior: do NOT force-kill processes. Instead notify the user which apps
  // would be closed and recommend closing them manually. This avoids data loss and
  // prevents abusive behavior.
  try {
    const psDetectScript = `
      $whitelist = @(${whitelistString})
      $myPid = ${process.pid}
      $badApps = Get-Process | Where-Object { $_.MainWindowHandle -ne 0 -and $whitelist -notcontains $_.Name -and $_.Id -ne $myPid }
      if ($badApps.Count -gt 0) { $badApps | Select-Object -ExpandProperty Name -Unique }
    `;
    const encoded = Buffer.from(psDetectScript, 'utf16le').toString('base64');
    exec(`powershell.exe -NoProfile -EncodedCommand ${encoded}`, (err, stdout) => {
      const apps = stdout ? stdout.trim().split('\n').map(s => s.trim()).filter(s => s.length) : [];
      if (apps.length > 0) {
        dialog.showMessageBoxSync({
          type: 'warning',
          buttons: ['OK'],
          title: 'Prohibited Applications Detected',
          message: 'The following applications may interfere with the secure exam. Please close them manually:',
          detail: apps.join(', ')
        });
      }
    });
  } catch (e) {
    console.warn('[SECURE BROWSER] Could not enumerate processes for detection.', e);
  }
}

// --- EXTREME REGISTRY LOCKDOWN ---
function disableTaskManager() {
  if (process.platform === 'win32') {
    // Only modify registry if explicitly allowed via env var to avoid surprising changes.
    if (process.env.ALLOW_REGISTRY_CHANGE === '1') {
      try {
        execSync('reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System /v DisableTaskMgr /t REG_DWORD /d 1 /f', { stdio: 'ignore' });
        console.log('[SECURE BROWSER] Task Manager physically disabled via Registry.');
      } catch (e) {
        console.warn('[SECURE BROWSER] Could not disable Task Manager (may lack permissions).');
      }
    } else {
      console.log('[SECURE BROWSER] Skipping registry changes to disable Task Manager (ALLOW_REGISTRY_CHANGE not set).');
    }
  }
}

function enableTaskManager() {
  if (process.platform === 'win32') {
    if (process.env.ALLOW_REGISTRY_CHANGE === '1') {
      try {
        execSync('reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Policies\\System /v DisableTaskMgr /t REG_DWORD /d 0 /f', { stdio: 'ignore' });
        console.log('[SECURE BROWSER] Task Manager restored via Registry.');
      } catch (e) {
        console.warn('[SECURE BROWSER] Failed to restore Task Manager.');
      }
    } else {
      console.log('[SECURE BROWSER] Skipping registry restoration (ALLOW_REGISTRY_CHANGE not set).');
    }
  }
}

process.on('uncaughtException', (err) => {
  console.error('[CRASH]', err);
  enableTaskManager();
  process.exit(1);
});
// ---------------------------------

let mainWindow;
let splashWindow;

// Track blackout windows for secondary monitors
let blackoutWindows = [];
let isAppQuitting = false;

app.on('before-quit', () => {
  isAppQuitting = true;
});

function manageSecondaryMonitors() {
  // Clear existing blackout windows
  blackoutWindows.forEach(win => {
    if (win && !win.isDestroyed()) {
      win.close();
    }
  });
  blackoutWindows = [];

  const displays = screen.getAllDisplays();
  const primaryDisplay = screen.getPrimaryDisplay();

  displays.forEach(display => {
    if (display.id !== primaryDisplay.id) {
      console.log(`[SECURE BROWSER] Secondary monitor detected (${display.id}). Blinding it.`);
      const blackout = new BrowserWindow({
        x: display.bounds.x,
        y: display.bounds.y,
        width: display.bounds.width,
        height: display.bounds.height,
        kiosk: true,
        alwaysOnTop: true,
        frame: false,
        skipTaskbar: true,
        hasShadow: false,
        backgroundColor: '#000000',
        focusable: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      });

      // Keep it completely black
      blackout.loadURL(`data:text/html;charset=utf-8,<html><body style="background-color:black;margin:0;overflow:hidden;display:flex;justify-content:center;align-items:center;color:#333;font-family:sans-serif;"><h2>SECONDARY MONITOR DISABLED</h2></body></html>`);

      // Elevate to screen-saver level to block absolutely everything
      blackout.setAlwaysOnTop(true, 'screen-saver');
      
      // Prevent closing
      blackout.on('close', (e) => {
        if (!isAppQuitting) {
          e.preventDefault();
        }
      });

      blackoutWindows.push(blackout);
    }
  });
}

async function createWindow() {
  const startTime = Date.now();

  // 1. Instantly sanitize the environment upon launch (warn user)
  await sanitizeEnvironment(true);
  
  // 1b. Disable Task Manager via Registry
  disableTaskManager();

  // 2. Continuous aggressive background sanitization every 10 seconds
  setInterval(sanitizeEnvironment, 10000);

  splashWindow = new BrowserWindow({
    width: 500,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    resizable: false,
    show: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
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
      webviewTag: false,
      preload: path.join(__dirname, 'preload.js'),
      devTools: process.env.NODE_ENV === 'development' // Disable DevTools in production
    }
  });

  // Intercept and prevent context menu via webContents instead of low-level window hooks
  // This avoids manipulating window enabled state and prevents focus/interaction side-effects.
  mainWindow.webContents.on('context-menu', (event) => {
    try {
      event.preventDefault();
    } catch (e) {
      // If event doesn't support preventDefault, just ignore
    }
  });

  // Aggressive Kiosk Enforcement: Soft focus recovery with threshold to avoid loops
  let blurCount = 0;
  let lastBlur = 0;
  mainWindow.on('blur', () => {
    const now = Date.now();
    if (now - lastBlur > 3000) {
      blurCount = 0;
    }
    blurCount += 1;
    lastBlur = now;

    // Only forcibly refocus if there are repeated blurs within a short time window
    if (blurCount >= 3) {
      if (mainWindow) mainWindow.focus();
    } else {
      // gentle attempt after a short delay
      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.focus();
      }, 400);
    }
  });

  // Elevate window level to 'screen-saver' to block Task View overlays on Windows
  mainWindow.setAlwaysOnTop(true, 'screen-saver');

  // Remove the default menu bar
  mainWindow.setMenu(null);

  // SECURE KIOSK: Prevent opening external links in new windows (e.g. target="_blank")
  mainWindow.webContents.setWindowOpenHandler((details) => {
    console.log('Blocked attempt to open new window:', details.url);
    return { action: 'deny' };
  });

  // Strip X-Frame-Options to allow embedding any site in the webview
  // Preserve response headers — do NOT strip CSP or X-Frame-Options (keeps browser protections intact).
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      cancel: false,
      responseHeaders: details.responseHeaders
    });
  });

  // SECURE KIOSK: Prevent navigating away from the app
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Allow localhost, file paths, and deployed links (https)
    const isAllowed = url.startsWith('http://localhost') || url.startsWith('file://') || url.startsWith('https://');
    
    if (!isAllowed) {
      event.preventDefault();
      console.log('Blocked external navigation to:', url);
    }
  });

  // Require explicit user consent for display media requests; do not auto-grant.
  mainWindow.webContents.session.setDisplayMediaRequestHandler((request, callback) => {
    console.warn('Display media request received; denying by default for security.', request);
    // Deny by default. Renderer should ask user and provide a secure, validated flow.
    callback({});
  });

  const isDev = !app.isPackaged;
  
  const urlArg = process.argv.find(arg => arg.startsWith('nexora://'));
  
  if (urlArg) {
    handleCustomUrl(urlArg);
  } else {
    if (isDev) {
      // In development, load the Vite dev server to the kiosk login route
      mainWindow.loadURL('http://localhost:5173/#/kiosk-login');
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

          // Initialize the native browser watermark overlay
          const watermarkWindow = new BrowserWindow({
            width: mainWindow.getBounds().width,
            height: mainWindow.getBounds().height,
            transparent: true,
            frame: false,
            alwaysOnTop: true,
            parent: mainWindow,
            hasShadow: false,
            focusable: false,
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true
            }
          });
          
          watermarkWindow.setIgnoreMouseEvents(true, { forward: true });
          
          // Match main window bounds and follow it
          watermarkWindow.setBounds(mainWindow.getBounds());
          mainWindow.on('resize', () => {
            if (!watermarkWindow.isDestroyed()) watermarkWindow.setBounds(mainWindow.getBounds());
          });
          mainWindow.on('move', () => {
            if (!watermarkWindow.isDestroyed()) watermarkWindow.setBounds(mainWindow.getBounds());
          });

          const watermarkText = `NEXORA SECURE BROWSER • ${new Date().toISOString().split('T')[0]}`;
          const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="monospace" font-size="13" fill="%23000000" opacity="0.08" transform="rotate(-30 150 100)">${watermarkText}</text></svg>`;
          const svgWatermark = `data:image/svg+xml;base64,${Buffer.from(svgString).toString('base64')}`;
          const html = `<html><body style="margin:0; overflow:hidden; background-image:url('${svgWatermark}');"></body></html>`;
          watermarkWindow.loadURL(`data:text/html;base64,${Buffer.from(html).toString('base64')}`);
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
  
  // Validate allowed deep-link prefixes to avoid arbitrary injection via the fragment.
  const allowedPrefixes = ['/test/', '/kiosk-login', '/admin', '/reports'];
  const isAllowed = allowedPrefixes.some(p => urlPath === p || urlPath.startsWith(p));
  if (!isAllowed) {
    console.warn('Blocked disallowed deep-link:', url);
    urlPath = '/kiosk-login';
  }

  // Load only the sanitized fragment; do NOT pass the rawUrl into the renderer.
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL(`http://localhost:5173/#${urlPath}`);
  } else {
    mainWindow.loadURL(`file://${path.join(__dirname, '../dist/index.html')}#${urlPath}`);
  }
}

let startupUrl = null;

app.on('ready', () => {
  const urlArg = process.argv.find(arg => arg.startsWith('nexora://'));
  if (urlArg) {
    startupUrl = urlArg;
  }

  createWindow();
  
  // Blind any secondary monitors on startup
  manageSecondaryMonitors();
  
  // Listen for displays being plugged in or unplugged during the exam
  screen.on('display-added', manageSecondaryMonitors);
  screen.on('display-removed', manageSecondaryMonitors);

  // SECURE EXAM FEATURES: Hook and disable common shortcuts
  // SECURE EXAM FEATURES: Register critical shortcuts only when explicitly allowed
  // For safety, only enable these in packaged kiosk deployments and when the
  // environment variable `ALLOW_SHORTCUT_BLOCK=1` is set by the deployment tooling.
  if (app.isPackaged && process.env.ALLOW_SHORTCUT_BLOCK === '1') {
    try {
      // Attempt to register a minimal set of shortcuts useful for kiosk enforcement.
      globalShortcut.register('CommandOrControl+Shift+Q', () => {
        // Developer kill switch remains available in managed builds
        app.quit();
      });

      // Block refresh shortcuts in kiosk builds
      globalShortcut.register('F5', () => console.log('Refresh blocked'));
      globalShortcut.register('CommandOrControl+R', () => console.log('Refresh blocked'));

      // Block DevTools and common close combinations
      globalShortcut.register('F12', () => console.log('DevTools blocked'));
      globalShortcut.register('CommandOrControl+Shift+I', () => console.log('DevTools blocked'));
      globalShortcut.register('CommandOrControl+W', () => console.log('Close window blocked'));
      globalShortcut.register('Alt+F4', () => console.log('Alt+F4 blocked'));
    } catch (e) {
      console.warn('[SECURE BROWSER] Failed to register some global shortcuts:', e);
    }
  } else {
    console.log('[SECURE BROWSER] Skipping globalShortcut registrations (not packaged or ALLOW_SHORTCUT_BLOCK not set).');
  }
});

// IPC handler for renderer to request screen capture with explicit user consent
ipcMain.handle('request-screen-capture', async (event) => {
  try {
    const resp = dialog.showMessageBoxSync({
      type: 'question',
      buttons: ['Allow', 'Deny'],
      defaultId: 1,
      cancelId: 1,
      title: 'Allow Screen Capture?',
      message: 'Do you want to allow screen capture for this exam session? Only allow if instructed by proctor.'
    });

    if (resp === 0) {
      const sources = await desktopCapturer.getSources({ types: ['screen'] });
      if (sources && sources[0]) {
        return { allowed: true, sourceId: sources[0].id };
      }
      return { allowed: false };
    }
    return { allowed: false };
  } catch (e) {
    console.warn('Error during screen-capture request', e);
    return { allowed: false };
  }
});

// Unregister shortcuts and restore registry when the app is quitting
app.on('will-quit', () => {
  enableTaskManager();
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

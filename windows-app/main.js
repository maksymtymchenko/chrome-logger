const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage } = require('electron');
const path = require('path');
const { ActivityTracker } = require('./src/activityTracker');
const { ConfigManager } = require('./src/configManager');

class WindowsActivityTracker {
    constructor() {
        this.mainWindow = null;
        this.tray = null;
        this.activityTracker = null;
        this.configManager = new ConfigManager();
        this.isQuitting = false;
    }

    async createWindow() {
        // Create the browser window
        this.mainWindow = new BrowserWindow({
            width: 520,
            height: 420,
            webPreferences: {
                nodeIntegration: true,
                contextIsolation: false,
                enableRemoteModule: true
            },
            icon: path.join(__dirname, 'assets', 'icon.png'),
            show: false,
            titleBarStyle: 'default',
            resizable: false,
            maximizable: false
        });

        // Load the app
        this.mainWindow.loadFile('src/renderer/index.html');

        // Show window when ready
        this.mainWindow.once('ready-to-show', () => {
            this.mainWindow.show();
        });

        // Handle window close
        this.mainWindow.on('close', (event) => {
            if (!this.isQuitting) {
                event.preventDefault();
                this.mainWindow.hide();
            }
        });

        // Handle window closed
        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });

        // Create tray
        this.createTray();

        // Initialize activity tracker
        this.activityTracker = new ActivityTracker(this.configManager);
        await this.activityTracker.start();

        // Setup IPC handlers
        this.setupIpcHandlers();
    }

    createTray() {
        const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
        const trayIcon = nativeImage.createFromPath(iconPath);

        this.tray = new Tray(trayIcon);
        this.tray.setToolTip('Windows Activity Tracker');

        const contextMenu = Menu.buildFromTemplate([{
                label: 'Show App',
                click: () => {
                    this.mainWindow.show();
                    this.mainWindow.focus();
                }
            },
            {
                label: 'Settings',
                click: () => {
                    this.mainWindow.show();
                    this.mainWindow.focus();
                    this.mainWindow.webContents.send('navigate-to', 'settings');
                }
            },
            { type: 'separator' },
            {
                label: 'Quit',
                click: () => {
                    this.isQuitting = true;
                    app.quit();
                }
            }
        ]);

        this.tray.setContextMenu(contextMenu);
        this.tray.on('double-click', () => {
            this.mainWindow.show();
            this.mainWindow.focus();
        });
    }

    setupIpcHandlers() {
        // Get current status
        ipcMain.handle('get-status', async() => {
            return {
                isTracking: this.activityTracker ? this.activityTracker.isTracking : false,
                config: this.configManager.getConfig()
            };
        });

        // Update configuration
        ipcMain.handle('update-config', async(event, config) => {
            this.configManager.updateConfig(config);
            if (this.activityTracker) {
                await this.activityTracker.updateConfig(config);
            }
            return { success: true };
        });

        // Start/Stop tracking
        ipcMain.handle('toggle-tracking', async() => {
            if (this.activityTracker) {
                if (this.activityTracker.isTracking) {
                    await this.activityTracker.stop();
                } else {
                    await this.activityTracker.start();
                }
                return { isTracking: this.activityTracker.isTracking };
            }
            return { isTracking: false };
        });

        // Handle minimize to tray
        ipcMain.on('minimize-to-tray', () => {
            if (this.mainWindow) {
                this.mainWindow.hide();
            }
        });
    }
}

// App event handlers
app.whenReady().then(async() => {
    const tracker = new WindowsActivityTracker();
    await tracker.createWindow();
});

app.on('window-all-closed', () => {
    // On macOS, keep app running even when all windows are closed
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
        const tracker = new WindowsActivityTracker();
        tracker.createWindow();
    }
});

app.on('before-quit', () => {
    // Clean up before quitting
    if (global.tracker && global.tracker.activityTracker) {
        global.tracker.activityTracker.stop();
    }
});
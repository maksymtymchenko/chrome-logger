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
        this.ipcHandlersSetup = false;
        this.hasShownWindow = false;
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

        // Show window when ready (only on first launch)
        this.mainWindow.once('ready-to-show', () => {
            // Show window only if it's the first time or if explicitly requested
            if (!this.hasShownWindow) {
                this.mainWindow.show();
                this.hasShownWindow = true;
            }
        });

        // Handle window close - hide to tray instead of quitting
        this.mainWindow.on('close', (event) => {
            if (!this.isQuitting) {
                event.preventDefault();
                this.mainWindow.hide();
                console.log('Window hidden to tray, app continues running in background');
            }
        });

        // Handle window closed
        this.mainWindow.on('closed', () => {
            this.mainWindow = null;
        });

        // Create tray (only if not already created)
        if (!this.tray) {
            this.createTray();
        }

        // Initialize activity tracker (only if not already created)
        if (!this.activityTracker) {
            this.activityTracker = new ActivityTracker(this.configManager);
            await this.activityTracker.start();
        }

        // Setup IPC handlers (only if not already set up)
        if (!this.ipcHandlersSetup) {
            this.setupIpcHandlers();
            this.ipcHandlersSetup = true;
        }
    }

    createTray() {
        const iconPath = path.join(__dirname, 'assets', 'tray-icon.png');
        const trayIcon = nativeImage.createFromPath(iconPath);

        this.tray = new Tray(trayIcon);
        this.tray.setToolTip('Windows Activity Tracker');

        const contextMenu = Menu.buildFromTemplate([{
                label: 'Show App',
                click: () => {
                    if (this.mainWindow) {
                        this.mainWindow.show();
                        this.mainWindow.focus();
                    } else {
                        // Recreate window if it was destroyed
                        this.createWindow();
                    }
                }
            },
            {
                label: 'Settings',
                click: () => {
                    if (this.mainWindow) {
                        this.mainWindow.show();
                        this.mainWindow.focus();
                        this.mainWindow.webContents.send('navigate-to', 'settings');
                    } else {
                        this.createWindow();
                        setTimeout(() => {
                            this.mainWindow.webContents.send('navigate-to', 'settings');
                        }, 1000);
                    }
                }
            },
            { type: 'separator' },
            {
                label: this.activityTracker && this.activityTracker.isTracking ? 'Stop Tracking' : 'Start Tracking',
                click: () => {
                    if (this.activityTracker) {
                        if (this.activityTracker.isTracking) {
                            this.activityTracker.stop();
                        } else {
                            this.activityTracker.start();
                        }
                        // Update the menu
                        this.createTray();
                    }
                }
            },
            { type: 'separator' },
            {
                label: 'Quit',
                click: () => {
                    this.isQuitting = true;
                    if (this.activityTracker) {
                        this.activityTracker.stop();
                    }
                    app.quit();
                }
            }
        ]);

        this.tray.setContextMenu(contextMenu);
        this.tray.on('double-click', () => {
            if (this.mainWindow) {
                this.mainWindow.show();
                this.mainWindow.focus();
            } else {
                // Recreate window if it was destroyed
                this.createWindow();
            }
        });
    }

    setupIpcHandlers() {
        // Get current status
        ipcMain.handle('get-status', async() => {
            try {
                const config = this.configManager.getConfig();
                console.log('Sending status with config:', config);
                console.log('Username in config:', config.username);
                console.log('Config type:', typeof config);
                console.log('Config keys:', Object.keys(config || {}));

                const response = {
                    isTracking: this.activityTracker ? this.activityTracker.isTracking : false,
                    config: config
                };

                console.log('Sending response:', response);
                return response;
            } catch (error) {
                console.error('Error in get-status handler:', error);
                return {
                    isTracking: false,
                    config: { username: 'Unknown' }
                };
            }
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

        // Get laptop name
        ipcMain.handle('get-laptop-name', async() => {
            const os = require('os');
            return os.hostname();
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
    global.tracker = tracker; // Store globally to prevent garbage collection
    await tracker.createWindow();
});

app.on('window-all-closed', () => {
    // Keep app running in background on all platforms
    // The app will only quit when explicitly requested via tray menu
    console.log('All windows closed, but keeping app running in background');
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
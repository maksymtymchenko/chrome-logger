const clipboardy = require('clipboardy');
const si = require('systeminformation');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Mac window tracking using AppleScript

class ActivityTracker {
    constructor(configManager) {
        this.configManager = configManager;
        this.isTracking = false;
        this.trackingInterval = null;
        this.screenshotInterval = null;
        this.clipboardInterval = null;
        this.lastActivity = null;
        this.lastScreenshot = null;
        this.activityBuffer = [];
        this.screenshotBuffer = [];
        this.lastClipboard = '';
        this.currentWindow = null;
        this.idleStartTime = null;
        this.isIdle = false;

        // Screenshot directory
        this.screenshotDir = path.join(os.homedir(), '.windows-activity-tracker', 'screenshots');
        this.ensureScreenshotDir();
    }

    ensureScreenshotDir() {
        if (!fs.existsSync(this.screenshotDir)) {
            fs.mkdirSync(this.screenshotDir, { recursive: true });
        }
    }

    getDeviceId() {
        // Generate a consistent device ID for this machine
        const os = require('os');
        const crypto = require('crypto');
        const machineId = os.hostname() + os.platform() + os.arch();
        return crypto.createHash('md5').update(machineId).digest('hex').substring(0, 16);
    }

    async getMacActiveWindow() {
        try {
            const { exec } = require('child_process');
            const util = require('util');
            const execAsync = util.promisify(exec);

            // AppleScript to get active window info
            const script = `
                tell application "System Events"
                    set frontApp to first application process whose frontmost is true
                    set appName to name of frontApp
                    set windowTitle to ""
                    try
                        set windowTitle to name of first window of frontApp
                    end try
                    return appName & "|" & windowTitle
                end tell
            `;

            const result = await execAsync(`osascript -e '${script}'`);
            const [appName, windowTitle] = result.stdout.trim().split('|');

            return {
                title: windowTitle || appName,
                owner: {
                    name: appName,
                    path: 'unknown'
                },
                bounds: { x: 0, y: 0, width: 1920, height: 1080 }
            };
        } catch (error) {
            console.log('Error getting Mac active window:', error.message);
            return null;
        }
    }

    async start() {
        if (this.isTracking) return;

        console.log('Starting Activity Tracker...');
        this.isTracking = true;

        // Start tracking intervals
        this.startActivityTracking();
        this.startScreenshotTracking();
        this.startClipboardTracking();
        this.startClickTracking();

        console.log('Activity tracking started');
    }

    async stop() {
        if (!this.isTracking) return;

        console.log('Stopping Windows Activity Tracker...');
        this.isTracking = false;

        // Clear intervals
        if (this.trackingInterval) {
            clearInterval(this.trackingInterval);
            this.trackingInterval = null;
        }

        if (this.screenshotInterval) {
            clearInterval(this.screenshotInterval);
            this.screenshotInterval = null;
        }

        if (this.clipboardInterval) {
            clearInterval(this.clipboardInterval);
            this.clipboardInterval = null;
        }

        // Send remaining data
        await this.flushBuffers();

        console.log('Activity tracking stopped');
    }

    startActivityTracking() {
        const interval = this.configManager.get('trackingInterval') || 5000;

        this.trackingInterval = setInterval(async() => {
            if (!this.isTracking) return;

            try {
                await this.trackCurrentActivity();
            } catch (error) {
                console.error('Error tracking activity:', error);
            }
        }, interval);
    }

    startScreenshotTracking() {
        if (!this.configManager.get('trackScreenshots')) return;

        // Event-based screenshots - no periodic interval needed
        console.log('Event-based screenshot tracking enabled');
    }

    startClipboardTracking() {
        if (!this.configManager.get('trackClipboard')) {
            console.log('Clipboard tracking disabled in config');
            return;
        }

        console.log('Starting clipboard tracking...');
        this.clipboardInterval = setInterval(async() => {
            if (!this.isTracking) return;

            try {
                await this.trackClipboard();
            } catch (error) {
                console.error('Error tracking clipboard:', error);
            }
        }, 2000); // Check clipboard every 2 seconds
    }

    startClickTracking() {
        if (!this.configManager.get('trackScreenshots') || !this.configManager.get('screenshotOnClick')) return;

        // For macOS, we'll use a simple approach to detect clicks
        // This is a basic implementation - in production you might want more sophisticated click detection
        if (process.platform === 'darwin') {
            this.setupMacClickTracking();
        } else if (process.platform === 'win32') {
            this.setupWindowsClickTracking();
        } else {
            this.setupLinuxClickTracking();
        }
    }

    setupMacClickTracking() {
        // Simple click detection using AppleScript
        // This is a basic implementation - in production you'd want more sophisticated tracking
        const { exec } = require('child_process');
        const util = require('util');
        const execAsync = util.promisify(exec);

        // Use a simple approach: check for mouse movement/click activity
        setInterval(async() => {
            if (!this.isTracking) return;

            try {
                // This is a simplified approach - in production you'd want proper mouse event detection
                // For now, we'll just log that click tracking is enabled
                // Real implementation would require native modules or more sophisticated detection
            } catch (error) {
                console.error('Error in click tracking:', error);
            }
        }, 5000); // Check every 5 seconds as a placeholder
    }

    setupWindowsClickTracking() {
        // Windows click tracking would go here
        console.log('Windows click tracking not implemented yet');
    }

    setupLinuxClickTracking() {
        // Linux click tracking would go here
        console.log('Linux click tracking not implemented yet');
    }

    // Method to trigger screenshot on click (to be called by actual click detection)
    async onClickDetected() {
        if (!this.configManager.get('trackScreenshots') || !this.configManager.get('screenshotOnClick')) return;

        try {
            await this.takeScreenshot('click');
        } catch (error) {
            console.error('Error taking screenshot on click:', error);
        }
    }

    async trackCurrentActivity() {
        try {
            let activeWindow = null;
            const now = Date.now();
            const config = this.configManager.getConfig();

            // Use Mac-specific window tracking
            if (process.platform === 'darwin') {
                activeWindow = await this.getMacActiveWindow();
                if (activeWindow) {
                    console.log('Mac active window:', activeWindow.owner.name, '-', activeWindow.title);
                }
            }

            // Fallback to process-based tracking if Mac window tracking fails
            if (!activeWindow) {
                const processes = await si.processes();
                const topProcess = processes.list
                    .filter(proc => proc.cpu > 0)
                    .sort((a, b) => b.cpu - a.cpu)[0];

                if (topProcess) {
                    activeWindow = {
                        title: `${topProcess.name} (${topProcess.pid})`,
                        owner: {
                            name: topProcess.name,
                            path: topProcess.path || 'unknown'
                        },
                        bounds: { x: 0, y: 0, width: 1920, height: 1080 }
                    };
                }
            }

            if (!activeWindow) return;

            // Check if window changed
            const windowChanged = !this.currentWindow ||
                this.currentWindow.title !== activeWindow.title ||
                this.currentWindow.owner.name !== activeWindow.owner.name;

            if (windowChanged) {
                // Record previous window activity if it existed
                if (this.currentWindow && this.lastActivity) {
                    const duration = now - this.lastActivity;
                    if (duration >= config.minActivityDuration) {
                        await this.recordActivity(this.currentWindow, duration);
                    }
                }

                // Update current window
                this.currentWindow = {
                    title: activeWindow.title,
                    owner: {
                        name: activeWindow.owner.name,
                        path: activeWindow.owner.path || 'unknown'
                    },
                    bounds: activeWindow.bounds || { x: 0, y: 0, width: 1920, height: 1080 },
                    timestamp: now
                };

                this.lastActivity = now;
                this.isIdle = false;
                this.idleStartTime = null;

                // Take screenshot on window change
                if (this.configManager.get('trackScreenshots') && this.configManager.get('screenshotOnWindowChange')) {
                    try {
                        await this.takeScreenshot('window_change');
                    } catch (error) {
                        console.error('Error taking screenshot on window change:', error);
                    }
                }
            } else if (this.currentWindow) {
                // Update duration for current window (record every 30 seconds)
                const duration = now - this.lastActivity;
                if (duration >= 30000) { // Record every 30 seconds
                    await this.recordActivity(this.currentWindow, duration);
                    this.lastActivity = now;
                }
            }

            // Check for idle state
            await this.checkIdleState(activeWindow);

        } catch (error) {
            console.error('Error tracking current activity:', error);
        }
    }

    async checkIdleState(activeWindow) {
        const config = this.configManager.getConfig();
        const maxIdleTime = config.maxIdleTime || 300000; // 5 minutes
        const now = Date.now();

        // Simple idle detection - if window hasn't changed for maxIdleTime
        if (this.lastActivity && (now - this.lastActivity) > maxIdleTime) {
            if (!this.isIdle) {
                this.isIdle = true;
                this.idleStartTime = now;
                console.log('User is idle');
            }
        } else {
            if (this.isIdle) {
                this.isIdle = false;
                console.log('User is active again');
            }
        }
    }

    async recordActivity(window, duration) {
        const config = this.configManager.getConfig();
        const username = config.username || 'Unknown';

        const activity = {
            username: username,
            deviceId: this.getDeviceId(),
            domain: 'windows-desktop',
            timestamp: Date.now(),
            durationMs: duration, // Add durationMs at root level
            type: 'window_activity',
            data: {
                application: window.owner.name,
                title: window.title,
                duration: duration,
                isIdle: this.isIdle,
                bounds: window.bounds,
                path: window.owner.path
            }
        };

        console.log('Recording activity:', {
            app: window.owner.name,
            title: window.title,
            duration: duration
        });

        this.activityBuffer.push(activity);

        // Send data if buffer is full (use configurable batch size)
        const batchSize = this.configManager.get('batchSize') || 20;
        if (this.activityBuffer.length >= batchSize) {
            await this.sendActivityData();
        }
    }

    async trackClipboard() {
        try {
            const currentClipboard = await clipboardy.read();
            console.log('Clipboard check - current length:', currentClipboard ? currentClipboard.length : 0);
            console.log('Last clipboard length:', this.lastClipboard ? this.lastClipboard.length : 0);

            if (currentClipboard && currentClipboard !== this.lastClipboard) {
                console.log('New clipboard content detected!');
                const config = this.configManager.getConfig();
                const username = config.username || 'Unknown';

                const clipboardActivity = {
                    username: username,
                    deviceId: this.getDeviceId(),
                    domain: 'windows-desktop',
                    timestamp: Date.now(),
                    durationMs: 1000, // Clipboard events are instant, but give them 1 second duration
                    reason: 'clipboard_copy',
                    type: 'clipboard',
                    data: {
                        content: currentClipboard.substring(0, 1000), // Limit content length
                        length: currentClipboard.length,
                        type: this.detectClipboardType(currentClipboard),
                        application: this.currentWindow ? this.currentWindow.owner.name : 'Unknown',
                        windowTitle: this.currentWindow ? this.currentWindow.title : 'Unknown',
                        url: this.detectUrlFromClipboard(currentClipboard)
                    }
                };

                console.log('Created clipboard activity:', clipboardActivity);
                this.activityBuffer.push(clipboardActivity);
                this.lastClipboard = currentClipboard;

                // Send clipboard data immediately
                console.log('Sending clipboard data to server...');
                await this.sendActivityData();
                console.log('Clipboard data sent successfully');
            }
        } catch (error) {
            // Clipboard access might fail on some systems
            console.error('Clipboard access error:', error.message);
            console.error('Full error:', error);
        }
    }

    detectClipboardType(content) {
        if (content.includes('http://') || content.includes('https://')) {
            return 'url';
        } else if (content.includes('@') && content.includes('.')) {
            return 'email';
        } else if (/^\d+$/.test(content)) {
            return 'number';
        } else if (content.includes('\n')) {
            return 'multiline_text';
        } else {
            return 'text';
        }
    }

    detectUrlFromClipboard(content) {
        // Extract URL from clipboard content if it contains one
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        const matches = content.match(urlRegex);
        return matches ? matches[0] : null;
    }

    async takeScreenshot(reason = 'event') {
        try {
            const { exec } = require('child_process');
            const util = require('util');
            const execAsync = util.promisify(exec);

            const timestamp = Date.now();
            const username = this.configManager.get('username') || 'Unknown';
            const filename = `${timestamp}_${username}_screenshot.png`;
            const filepath = path.join(this.screenshotDir, filename);

            // Use platform-specific screenshot tool
            if (process.platform === 'darwin') {
                // macOS screenshot
                await execAsync(`screencapture -x "${filepath}"`);
            } else if (process.platform === 'win32') {
                // Windows screenshot (placeholder)
                console.log('Windows screenshot not implemented yet');
            } else {
                // Linux screenshot
                await execAsync(`gnome-screenshot -f "${filepath}"`);
            }

            // Create activity event for screenshot
            const screenshotActivity = {
                username: username,
                deviceId: this.getDeviceId(),
                domain: 'windows-desktop',
                timestamp: timestamp,
                durationMs: 1000, // Screenshots typically take ~1 second
                type: 'screenshot',
                reason: reason,
                data: {
                    filename: filename,
                    reason: reason,
                    application: this.currentWindow.owner.name || 'Unknown',
                    title: this.currentWindow.title || 'Screenshot'
                }
            };

            // Add to activity buffer
            this.activityBuffer.push(screenshotActivity);

            const screenshotData = {
                username: username,
                timestamp: timestamp,
                filename: filename,
                filepath: filepath,
                reason: reason
            };

            this.screenshotBuffer.push(screenshotData);

            // Send both activity and screenshot data
            await this.sendActivityData();
            await this.sendScreenshotData();

        } catch (error) {
            console.error('Error taking screenshot:', error);
        }
    }

    async sendActivityData() {
        if (this.activityBuffer.length === 0) return;

        try {
            const config = this.configManager.getConfig();
            const serverUrl = config.serverUrl || 'http://localhost:8080';

            const response = await axios.post(`${serverUrl}/collect-activity`, {
                events: this.activityBuffer
            });

            if (response.status === 200) {
                console.log(`Sent ${this.activityBuffer.length} activity events`);
                this.activityBuffer = [];
            }
        } catch (error) {
            console.error('Error sending activity data:', error);
        }
    }

    async sendScreenshotData() {
        if (this.screenshotBuffer.length === 0) return;

        try {
            const config = this.configManager.getConfig();
            const serverUrl = config.serverUrl || 'http://localhost:8080';

            // Process each screenshot
            for (const screenshot of this.screenshotBuffer) {
                try {
                    // Copy file to server screenshots directory
                    const serverScreenshotDir = path.join(__dirname, '..', '..', '..', 'server', 'screenshots');
                    const serverFilePath = path.join(serverScreenshotDir, screenshot.filename);

                    // Ensure server directory exists
                    if (!fs.existsSync(serverScreenshotDir)) {
                        fs.mkdirSync(serverScreenshotDir, { recursive: true });
                    }

                    // Copy the file
                    fs.copyFileSync(screenshot.filepath, serverFilePath);
                    console.log(`Copied screenshot to server: ${screenshot.filename}`);

                    // Read the screenshot file and convert to base64
                    const screenshotBuffer = fs.readFileSync(screenshot.filepath);
                    const base64Screenshot = `data:image/png;base64,${screenshotBuffer.toString('base64')}`;

                    // Send to server's screenshot endpoint to create database record
                    const screenshotResponse = await axios.post(`${serverUrl}/collect-screenshot`, {
                        deviceId: this.getDeviceId(),
                        domain: 'windows-desktop',
                        username: screenshot.username,
                        screenshot: base64Screenshot
                    });

                    if (screenshotResponse.status === 200) {
                        console.log(`Created database record for screenshot: ${screenshot.filename}`);
                    }
                } catch (copyError) {
                    console.error('Error processing screenshot:', copyError);
                }
            }

            // Also send metadata to activity endpoint
            const response = await axios.post(`${serverUrl}/collect-activity`, {
                events: this.screenshotBuffer.map(s => ({
                    username: s.username,
                    deviceId: this.getDeviceId(),
                    domain: 'windows-desktop',
                    timestamp: s.timestamp,
                    type: 'screenshot',
                    data: {
                        filename: s.filename,
                        reason: s.reason
                    }
                }))
            });

            if (response.status === 200) {
                console.log(`Sent ${this.screenshotBuffer.length} screenshot events`);
                this.screenshotBuffer = [];
            }
        } catch (error) {
            console.error('Error sending screenshot data:', error);
        }
    }

    async flushBuffers() {
        await this.sendActivityData();
        await this.sendScreenshotData();
    }

    async getStats() {
        return {
            isTracking: this.isTracking,
            currentWindow: this.currentWindow,
            isIdle: this.isIdle,
            bufferSize: this.activityBuffer.length + this.screenshotBuffer.length,
            lastActivity: this.lastActivity
        };
    }

    async getRecentActivity() {
        // This would typically fetch from the server
        // For now, return current buffer
        return this.activityBuffer.slice(-10);
    }

    async getApplications() {
        try {
            const processes = await si.processes();
            const apps = processes.list
                .filter(proc => proc.name && !proc.name.includes('System'))
                .map(proc => ({
                    name: proc.name,
                    pid: proc.pid,
                    cpu: proc.cpu,
                    memory: proc.mem
                }))
                .sort((a, b) => b.cpu - a.cpu)
                .slice(0, 20);

            return apps;
        } catch (error) {
            console.error('Error getting applications:', error);
            return [];
        }
    }

    async updateConfig(newConfig) {
        this.configManager.updateConfig(newConfig);

        // Restart tracking with new config
        if (this.isTracking) {
            await this.stop();
            await this.start();
        }
    }
}

module.exports = { ActivityTracker };
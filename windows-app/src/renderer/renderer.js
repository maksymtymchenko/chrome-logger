const { ipcRenderer } = require('electron');

class SimpleActivityTracker {
    constructor() {
        console.log('SimpleActivityTracker constructor called');
        this.setupComplete = false;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.checkSetupStatus();
    }

    setupEventListeners() {
        // Username input
        const usernameInput = document.getElementById('usernameInput');
        const saveUsernameBtn = document.getElementById('saveUsername');
        const changeUsernameBtn = document.getElementById('changeUsername');

        // Enter key to save
        usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.saveUsername();
            }
        });

        // Save button
        saveUsernameBtn.addEventListener('click', () => {
            this.saveUsername();
        });

        // Change username button
        if (changeUsernameBtn) {
            changeUsernameBtn.addEventListener('click', () => {
                this.showSetupDialog();
            });
        }

        // Input validation
        usernameInput.addEventListener('input', () => {
            this.hideError();
        });
    }

    async checkSetupStatus() {
        try {
            const status = await ipcRenderer.invoke('get-status');
            const config = status.config;

            console.log('Setup status check:', { config, username: config ? .username });

            if (config && config.username && config.username !== 'Unknown') {
                // Setup already complete
                console.log('Setup already complete, showing main content');
                this.showMainContent();
                this.setupComplete = true;
            } else {
                // Show setup dialog
                console.log('Setup not complete, showing setup dialog');
                this.showSetupDialog();
            }
        } catch (error) {
            console.error('Error checking setup status:', error);
            this.showSetupDialog();
        }
    }

    showSetupDialog() {
        const setupDialog = document.getElementById('setupDialog');
        const mainContent = document.getElementById('mainContent');

        mainContent.style.display = 'none';
        setupDialog.style.display = 'flex';
        setupDialog.classList.add('fade-in');

        // Focus after animation
        setTimeout(() => {
            document.getElementById('usernameInput').focus();
        }, 100);
    }

    showMainContent() {
        const setupDialog = document.getElementById('setupDialog');
        const mainContent = document.getElementById('mainContent');

        setupDialog.style.display = 'none';
        mainContent.style.display = 'flex';
        mainContent.classList.add('fade-in');

        // Update the current username display
        const currentUsernameElement = document.getElementById('currentUsername');
        if (currentUsernameElement) {
            // Get the current username from config
            ipcRenderer.invoke('get-status').then(status => {
                currentUsernameElement.textContent = status.config.username || 'Unknown';
            });
        }
    }

    async saveUsername() {
        const usernameInput = document.getElementById('usernameInput');
        const username = usernameInput.value.trim();

        if (!this.validateUsername(username)) {
            return;
        }

        try {
            // Show loading state
            const saveBtn = document.getElementById('saveUsername');
            const originalText = saveBtn.innerHTML;
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';

            // Update configuration
            await ipcRenderer.invoke('update-config', {
                username: username,
                serverUrl: 'http://localhost:8080',
                trackingInterval: 5000,
                screenshotInterval: 30000,
                trackClipboard: true,
                trackApplications: true,
                trackWindows: true,
                trackScreenshots: true
            });

            // Start tracking
            await ipcRenderer.invoke('toggle-tracking');

            // Show success and close after delay
            this.showSuccess('Setup complete! Starting tracking...');

            setTimeout(() => {
                this.showMainContent();
                this.setupComplete = true;

                // Auto-minimize after 3 seconds
                setTimeout(() => {
                    // Send message to main process to minimize
                    ipcRenderer.send('minimize-to-tray');
                }, 3000);
            }, 1500);

        } catch (error) {
            console.error('Error saving username:', error);
            this.showError('Failed to save configuration. Please try again.');

            // Restore button state
            const saveBtn = document.getElementById('saveUsername');
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-check"></i> Start Tracking';
        }
    }

    validateUsername(username) {
        if (!username) {
            this.showError('Please enter your name');
            return false;
        }

        if (username.length < 2) {
            this.showError('Name must be at least 2 characters');
            return false;
        }

        if (username.length > 50) {
            this.showError('Name must be less than 50 characters');
            return false;
        }

        // Basic validation - no special characters
        if (!/^[a-zA-Z0-9\s\-_]+$/.test(username)) {
            this.showError('Name can only contain letters, numbers, spaces, hyphens, and underscores');
            return false;
        }

        return true;
    }

    showError(message) {
        const errorElement = document.getElementById('errorMessage');
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }

    hideError() {
        const errorElement = document.getElementById('errorMessage');
        errorElement.textContent = '';
        errorElement.style.display = 'none';
    }

    showSuccess(message) {
        // Simple success notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            font-size: 14px;
            font-weight: 500;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing SimpleActivityTracker...');
    new SimpleActivityTracker();
});
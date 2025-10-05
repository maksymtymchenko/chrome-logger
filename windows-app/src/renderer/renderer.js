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

        // Use laptop name button
        const useLaptopNameBtn = document.getElementById('useLaptopName');
        if (useLaptopNameBtn) {
            useLaptopNameBtn.addEventListener('click', () => {
                this.useLaptopName();
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

            // Show main content if username is set and not 'Unknown'
            if (config && config.username && config.username !== 'Unknown') {
                console.log('Setup already complete, showing main content');
                console.log('Username found:', config.username);
                await this.showMainContent();
                this.setupComplete = true;
            } else {
                console.log('Setup not complete, showing setup dialog');
                console.log('Reason: config exists:', !!config, 'username exists:', !!config ? .username, 'username value:', config ? .username);
                await this.showSetupDialogWithLaptopName();
            }
        } catch (error) {
            console.error('Error checking setup status:', error);
            await this.showSetupDialogWithLaptopName();
        }
    }

    async showSetupDialogWithLaptopName() {
        const setupDialog = document.getElementById('setupDialog');
        const mainContent = document.getElementById('mainContent');

        mainContent.style.display = 'none';
        setupDialog.style.display = 'flex';
        setupDialog.classList.add('fade-in');

        // Get laptop name and set as default
        try {
            const laptopName = await ipcRenderer.invoke('get-laptop-name');
            const usernameInput = document.getElementById('usernameInput');

            if (laptopName && usernameInput) {
                usernameInput.value = laptopName;
                usernameInput.placeholder = `Enter your name (suggested: ${laptopName})`;

                // Add a helpful message
                const description = document.getElementById('setup-description');
                if (description) {
                    description.innerHTML = `Enter your name to start tracking your activity<br><small style="color: #666; font-size: 12px;">💡 Using your laptop name: <strong>${laptopName}</strong></small>`;
                }
            }
        } catch (error) {
            console.log('Could not get laptop name:', error);
        }

        // Focus after animation
        setTimeout(() => {
            document.getElementById('usernameInput').focus();
        }, 100);
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

    async showMainContent() {
        const setupDialog = document.getElementById('setupDialog');
        const mainContent = document.getElementById('mainContent');

        setupDialog.style.display = 'none';
        mainContent.style.display = 'flex';
        mainContent.classList.add('fade-in');

        // Update the current username display
        await this.loadUsername();
    }

    async loadUsername(retryCount = 0) {
        const currentUsernameElement = document.getElementById('currentUsername');
        if (!currentUsernameElement) return;

        try {
            // Get the current username from config
            const status = await ipcRenderer.invoke('get-status');
            console.log('Received status:', status);
            console.log('Username from config:', status.config ? .username);

            if (status && status.config && status.config.username) {
                currentUsernameElement.textContent = status.config.username;
                console.log('Username loaded successfully:', status.config.username);
            } else {
                currentUsernameElement.textContent = 'Unknown';
                console.log('No username found in config');
            }
        } catch (error) {
            console.error('Error getting status:', error);

            // Retry up to 3 times with increasing delay
            if (retryCount < 3) {
                console.log(`Retrying username load (attempt ${retryCount + 1}/3)...`);
                setTimeout(() => {
                    this.loadUsername(retryCount + 1);
                }, 1000 * (retryCount + 1)); // 1s, 2s, 3s delays
            } else {
                currentUsernameElement.textContent = 'Error loading username';
                console.error('Failed to load username after 3 attempts');
            }
        }
    }

    // Method to refresh username display (useful when returning from setup)
    async refreshUsername() {
        await this.loadUsername();
    }

    async useLaptopName() {
        try {
            const laptopName = await ipcRenderer.invoke('get-laptop-name');
            if (laptopName) {
                const usernameInput = document.getElementById('usernameInput');
                usernameInput.value = laptopName;
                this.hideError();

                // Show success message
                this.showSuccess(`Using laptop name: ${laptopName}`);

                // Auto-save after a short delay
                setTimeout(() => {
                    this.saveUsername();
                }, 1000);
            } else {
                this.showError('Could not get laptop name. Please enter manually.');
            }
        } catch (error) {
            console.error('Error getting laptop name:', error);
            this.showError('Could not get laptop name. Please enter manually.');
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

            setTimeout(async() => {
                await this.showMainContent();
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
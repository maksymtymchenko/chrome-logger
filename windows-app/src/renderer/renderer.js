const { ipcRenderer } = require('electron');

class SimpleActivityTracker {
    constructor() {
        console.log('SimpleActivityTracker constructor called');
        this.setupComplete = false;
        this.init();
    }

    async init() {
        this.setupEventListeners();

        // Wait for DOM to be fully ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', async() => {
                await this.checkSetupStatus();
            });
        } else {
            await this.checkSetupStatus();
        }
    }

    setupEventListeners() {
        // No event listeners needed since username change functionality is removed
    }

    async checkSetupStatus() {
        try {
            const status = await ipcRenderer.invoke('get-status');
            const config = status.config;

            console.log('Setup status check:', { config, username: config && config.username });

            // Always show main content since username change is disabled
            console.log('Showing main content');
            await this.showMainContent();
            this.setupComplete = true;
        } catch (error) {
            console.error('Error checking setup status:', error);
            // Still show main content even if there's an error
            await this.showMainContent();
            this.setupComplete = true;
        }
    }



    async showMainContent() {
        const mainContent = document.getElementById('mainContent');

        mainContent.style.display = 'flex';
        mainContent.classList.add('fade-in');

        // Update the current username display
        await this.loadUsername();

        // Start polling to ensure username loads
        this.startUsernamePolling();
    }

    async loadUsername(retryCount = 0) {
        const currentUsernameElement = document.getElementById('currentUsername');
        if (!currentUsernameElement) {
            console.log('currentUsernameElement not found, retrying...');
            if (retryCount < 3) {
                setTimeout(() => {
                    this.loadUsername(retryCount + 1);
                }, 500);
            }
            return;
        }

        try {
            console.log(`Loading username (attempt ${retryCount + 1})...`);
            // Get the current username from config
            const status = await ipcRenderer.invoke('get-status');
            console.log('Received status:', status);
            console.log('Username from config:', status.config && status.config.username);

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

    // Periodic check for username if still loading
    startUsernamePolling() {
        const checkInterval = setInterval(() => {
            const currentUsernameElement = document.getElementById('currentUsername');
            if (currentUsernameElement && currentUsernameElement.textContent === 'Loading...') {
                console.log('Username still loading, attempting to refresh...');
                this.loadUsername();
            } else {
                clearInterval(checkInterval);
            }
        }, 2000); // Check every 2 seconds

        // Stop polling after 30 seconds
        setTimeout(() => {
            clearInterval(checkInterval);
        }, 30000);
    }




}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing SimpleActivityTracker...');
    new SimpleActivityTracker();
});
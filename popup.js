// popup.js - Username setup and minimal functionality
const USERNAME_KEY = 'username';
const SETUP_COMPLETED_KEY = 'setup_completed';

// DOM elements
const setupDialog = document.getElementById('setupDialog');
const usernameInput = document.getElementById('usernameInput');
const saveUsernameBtn = document.getElementById('saveUsername');
const errorMessage = document.getElementById('errorMessage');

// Initialize popup
document.addEventListener('DOMContentLoaded', async() => {
    await checkSetupStatus();
    setupEventListeners();
});

async function checkSetupStatus() {
    try {
        const {
            [SETUP_COMPLETED_KEY]: setupCompleted
        } = await chrome.storage.local.get(SETUP_COMPLETED_KEY);

        if (!setupCompleted) {
            showSetupDialog();
        }
        // If setup is completed, the welcome message is already visible in HTML
    } catch (error) {
        console.error('Error checking setup status:', error);
        // If there's an error, show setup dialog as fallback
        showSetupDialog();
    }
}

function showSetupDialog() {
    setupDialog.classList.add('show');
    usernameInput.focus();
}

function hideSetupDialog() {
    setupDialog.classList.remove('show');
}


function showError(message) {
    errorMessage.textContent = message;
    errorMessage.style.display = 'block';
    usernameInput.style.borderColor = '#dc2626';
}

function hideError() {
    errorMessage.style.display = 'none';
    usernameInput.style.borderColor = '#e2e8f0';
}

function validateUsername(username) {
    if (!username || username.trim().length === 0) {
        return 'Name is required';
    }

    if (username.trim().length < 2) {
        return 'Name must be at least 2 characters';
    }

    if (username.trim().length > 50) {
        return 'Name must be less than 50 characters';
    }

    // Check for valid characters (letters, numbers, spaces, hyphens, underscores)
    if (!/^[a-zA-Z0-9\s\-_]+$/.test(username.trim())) {
        return 'Name can only contain letters, numbers, spaces, hyphens, and underscores';
    }

    return null;
}

async function saveUsername() {
    const username = usernameInput.value.trim();
    const validationError = validateUsername(username);

    if (validationError) {
        showError(validationError);
        return;
    }

    try {
        hideError();
        saveUsernameBtn.disabled = true;
        saveUsernameBtn.textContent = 'Setting up...';

        await chrome.storage.local.set({
            [USERNAME_KEY]: username,
            [SETUP_COMPLETED_KEY]: true
        });

        console.log('Username saved:', username);
        hideSetupDialog();

        // Close the popup after successful setup
        setTimeout(() => {
            window.close();
        }, 500);

    } catch (error) {
        console.error('Error saving username:', error);
        showError('Failed to save username. Please try again.');
    } finally {
        saveUsernameBtn.disabled = false;
        saveUsernameBtn.textContent = 'Get Started';
    }
}


function setupEventListeners() {
    // Username setup
    saveUsernameBtn.addEventListener('click', saveUsername);

    // Enter key to save
    usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            saveUsername();
        }
    });

    // Clear error on input
    usernameInput.addEventListener('input', () => {
        hideError();
    });
}
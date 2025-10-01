const USERNAME_KEY = "username";
const ACTIVITY_KEY = "activity_log";

// DOM elements
const usernameInput = document.getElementById("usernameInput");
const saveUsernameBtn = document.getElementById("saveUsernameBtn");
const usernameStatus = document.getElementById("usernameStatus");
const recentActivity = document.getElementById("recentActivity");

// Utility functions
function showStatus(element, message, type = 'success') {
    element.textContent = message;
    element.className = `status-message status-${type}`;
    element.style.display = 'block';

    if (type === 'success') {
        setTimeout(() => {
            element.style.display = 'none';
        }, 3000);
    }
}


// Load username
async function loadUsername() {
    try {
        const {
            [USERNAME_KEY]: username
        } = await chrome.storage.local.get(USERNAME_KEY);
        usernameInput.value = username || '';
    } catch (error) {
        console.error('Error loading username:', error);
    }
}

// Save username with validation
saveUsernameBtn.onclick = async() => {
    const val = usernameInput.value.trim();

    if (val.length > 50) {
        showStatus(usernameStatus, 'Username must be 50 characters or less', 'error');
        return;
    }

    try {
        await chrome.storage.local.set({
            [USERNAME_KEY]: val
        });

        const message = val ? `Username saved: ${val}` : 'Username cleared';
        showStatus(usernameStatus, message, 'success');

    } catch (error) {
        console.error('Error saving username:', error);
        showStatus(usernameStatus, 'Error saving username', 'error');
    }
};

// Update recent activity stats
async function updateRecentActivity() {
    try {
        const {
            [ACTIVITY_KEY]: activityLog
        } = await chrome.storage.local.get(ACTIVITY_KEY);
        if (activityLog && Array.isArray(activityLog)) {
            // Count activities from the last 24 hours
            const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
            const recentCount = activityLog.filter(entry =>
                entry.timestamp && entry.timestamp > oneDayAgo
            ).length;
            recentActivity.textContent = recentCount;
        } else {
            recentActivity.textContent = '0';
        }
    } catch (error) {
        console.error('Error updating recent activity:', error);
        recentActivity.textContent = '0';
    }
}

usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        saveUsernameBtn.click();
    }
});

// Add loading states
function setLoading(element, isLoading) {
    if (isLoading) {
        element.classList.add('loading');
        element.disabled = true;
    } else {
        element.classList.remove('loading');
        element.disabled = false;
    }
}

// Initialize the page
async function init() {
    try {
        await Promise.all([
            loadUsername()
        ]);
    } catch (error) {
        console.error('Error initializing options page:', error);
    }
}

// Start the application
init();
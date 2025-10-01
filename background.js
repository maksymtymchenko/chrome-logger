// background.js - Enhanced with better error handling and user feedback

const SEND_INTERVAL_MINUTES = 5; // batch send interval
const IDLE_THRESHOLD_SECONDS = 60; // treat as idle if idle >= this
const BUFFER_KEY = 'activity_buffer';
const LAST_STATE_KEY = 'last_state';
// Screenshot debouncing to prevent too many captures
let lastScreenshotTime = 0;
const SCREENSHOT_DEBOUNCE_MS = 2000; // Minimum 2 seconds between screenshots
const ACTIVITY_LOG_KEY = 'activity_log';
const LAST_SYNC_KEY = 'lastSync';
const SERVER_URL = 'http://localhost:8080';

// Helper: extract domain from URL
function extractDomain(url) {
    try {
        const u = new URL(url);
        return u.hostname.replace(/^www\./i, '').toLowerCase();
    } catch (e) {
        return null;
    }
}

// Device ID generator
async function getDeviceId() {
    const { deviceId } = await chrome.storage.local.get('deviceId');
    if (deviceId) return deviceId;
    const id = crypto.randomUUID();
    await chrome.storage.local.set({ deviceId: id });
    return id;
}

// Buffer management
async function appendToBuffer(item) {
    const data = await chrome.storage.local.get(BUFFER_KEY);
    const buffer = data[BUFFER_KEY] || [];
    buffer.push(item);
    await chrome.storage.local.set({
        [BUFFER_KEY]: buffer
    });
}

async function drainBuffer() {
    const data = await chrome.storage.local.get(BUFFER_KEY);
    const buffer = data[BUFFER_KEY] || [];
    await chrome.storage.local.set({
        [BUFFER_KEY]: []
    });
    return buffer;
}

// Check if domain is work-related (not excluded)
async function isWorkDomain(domain) {
    const { excluded_domains } = await chrome.storage.local.get('excluded_domains');
    return !(excluded_domains || []).includes(domain);
}

// Get display name (username or device ID)
async function getDisplayName() {
    const { username } = await chrome.storage.local.get('username');
    if (username && username.trim()) {
        return username.trim();
    }

    // Fallback to shortened device ID
    const deviceId = await getDeviceId();
    return `Device-${deviceId.substring(0, 8)}`;
}

// Record domain-time with local storage
async function recordDomainTime(domain, durationMs, reason = '') {
    if (!domain || durationMs <= 0) return;
    if (!(await isWorkDomain(domain))) {
        console.log("Excluded domain, skipping:", domain);
        return;
    }

    console.log("Recording:", domain, durationMs, "ms Reason:", reason);
    const deviceId = await getDeviceId();
    const displayName = await getDisplayName();
    const event = {
        deviceId,
        domain,
        durationMs,
        timestamp: Date.now(),
        reason,
        username: displayName
    };

    // Store in buffer for server sync
    await appendToBuffer(event);

    // Also store locally for popup display
    await appendToLocalLog(event);
}

// Append to local activity log
async function appendToLocalLog(event) {
    try {
        const {
            [ACTIVITY_LOG_KEY]: log
        } = await chrome.storage.local.get(ACTIVITY_LOG_KEY);
        const activityLog = log || [];
        activityLog.push(event);

        // Keep only last 1000 entries to prevent storage bloat
        const trimmedLog = activityLog.slice(-1000);

        await chrome.storage.local.set({
            [ACTIVITY_LOG_KEY]: trimmedLog
        });
    } catch (error) {
        console.error('Error storing local activity log:', error);
    }
}

// Current active tab tracking
let current = { tabId: null, windowId: null, domain: null, startTs: null, focused: true };

async function updateCurrentFromActiveTab() {
    try {
        const tabs = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
        const t = tabs && tabs[0];
        if (!t || !t.url) { await switchOut('no-active-tab'); return; }
        const domain = extractDomain(t.url);
        if (domain !== current.domain) {
            await switchOut('tab-change');
            current.tabId = t.id;
            current.windowId = t.windowId;
            current.domain = domain;
            current.startTs = Date.now();
            await takeScreenshot('tab-change'); // capture screenshot on tab change
        }
    } catch (e) { console.error("updateCurrentFromActiveTab error:", e); }
}

async function switchOut(reason = '') {
    if (current.domain && current.startTs) {
        const duration = Date.now() - current.startTs;
        await recordDomainTime(current.domain, duration, reason);
    }
    current.tabId = null;
    current.windowId = null;
    current.domain = null;
    current.startTs = null;
}

// Screenshot logic with debouncing
async function takeScreenshot(reason = 'user-action') {
    try {
        // Check debouncing
        const now = Date.now();
        if (now - lastScreenshotTime < SCREENSHOT_DEBOUNCE_MS) {
            console.log("Screenshot debounced, too soon since last capture");
            return;
        }
        lastScreenshotTime = now;

        chrome.tabs.query({ active: true, currentWindow: true }, async(tabs) => {
            if (!tabs || tabs.length === 0) return;
            const tab = tabs[0];
            const domain = extractDomain(tab.url);
            if (!(await isWorkDomain(domain))) return;

            chrome.tabs.captureVisibleTab(tab.windowId, { format: "png", quality: 50 }, async(dataUrl) => {
                if (chrome.runtime.lastError) return;
                console.log("Screenshot captured for:", domain, "Reason:", reason);

                // Send to server
                const deviceId = await getDeviceId();
                const displayName = await getDisplayName();
                const payload = {
                    deviceId,
                    domain,
                    timestamp: Date.now(),
                    screenshot: dataUrl,
                    username: displayName,
                    reason: reason
                };
                const screenshotUrl = `${SERVER_URL}/collect-screenshot`;

                try {
                    console.log("Attempting to send screenshot to:", screenshotUrl);
                    const response = await fetch(screenshotUrl, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    console.log("Response status:", response.status);
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    const result = await response.json();
                    console.log("Screenshot sent for:", domain, "Response:", result);
                } catch (e) {
                    console.error("Send screenshot failed:", e);
                    console.error("Error details:", e.message, e.stack);
                }
            });
        });
    } catch (e) { console.error("takeScreenshot error:", e); }
}

// Event listeners
chrome.tabs.onActivated.addListener(updateCurrentFromActiveTab);
chrome.windows.onFocusChanged.addListener(async(windowId) => {
    if (windowId === chrome.windows.WINDOW_ID_NONE) {
        await switchOut('window-blur');
        current.focused = false;
    } else {
        current.focused = true;
        await updateCurrentFromActiveTab();
    }
});
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if ((changeInfo.status === 'complete' || changeInfo.url) && tab.active) updateCurrentFromActiveTab();
});

// Idle detection
chrome.idle.setDetectionInterval(IDLE_THRESHOLD_SECONDS);
chrome.idle.onStateChanged.addListener(async(newState) => {
    if (newState === 'idle' || newState === 'locked') await switchOut('idle');
    else if (newState === 'active') await updateCurrentFromActiveTab();
});

// Periodic buffer send
chrome.alarms.create('send-buffer', { periodInMinutes: SEND_INTERVAL_MINUTES });

chrome.alarms.onAlarm.addListener(async(alarm) => {
    if (alarm.name === 'send-buffer') {
        const buffer = await drainBuffer();
        if (!buffer || buffer.length === 0) { console.log("Buffer empty"); return; }
        console.log("Sending batch:", buffer);

        try {
            // Separate activity events from tracking events
            const activityEvents = buffer.filter(event => !event.dataType);
            const trackingEvents = buffer.filter(event => event.dataType);

            // Send activity events
            if (activityEvents.length > 0) {
                const activityUrl = `${SERVER_URL}/collect-activity`;
                const activityResponse = await fetch(activityUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ events: activityEvents })
                });

                if (!activityResponse.ok) {
                    throw new Error(`Activity HTTP ${activityResponse.status}: ${activityResponse.statusText}`);
                }
                console.log("Activity batch sent successfully");
            }

            // Send tracking events
            if (trackingEvents.length > 0) {
                const trackingUrl = `${SERVER_URL}/collect-tracking`;
                const trackingResponse = await fetch(trackingUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ events: trackingEvents })
                });

                if (!trackingResponse.ok) {
                    throw new Error(`Tracking HTTP ${trackingResponse.status}: ${trackingResponse.statusText}`);
                }
                console.log("Tracking batch sent successfully");
            }

            // Update last sync time
            await chrome.storage.local.set({
                [LAST_SYNC_KEY]: Date.now()
            });

        } catch (e) {
            console.error("Send failed, restoring buffer", e);
            console.error("Error details:", e.message, e.stack);
            console.error("Server URL:", SERVER_URL);
            const existing = await chrome.storage.local.get(BUFFER_KEY);
            const restored = (existing[BUFFER_KEY] || []).concat(buffer);
            await chrome.storage.local.set({
                [BUFFER_KEY]: restored
            });
        }
    }
});

// Startup
chrome.runtime.onInstalled.addListener(async() => {
    await chrome.storage.local.set({
        [BUFFER_KEY]: [],
        lastSync: Date.now()
    });
    updateCurrentFromActiveTab();
});

// Listen for messages from content scripts to trigger screenshots and track data
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'takeScreenshot') {
        takeScreenshot(request.reason || 'user-interaction');
        sendResponse({ success: true });
    } else if (request.action === 'trackData') {
        handleTrackingData(request.dataType, request.data);
        sendResponse({ success: true });
    }
});

// Handle tracking data from content scripts
async function handleTrackingData(dataType, data) {
    try {
        const deviceId = await getDeviceId();
        const displayName = await getDisplayName();

        const trackingEvent = {
            deviceId,
            username: displayName,
            dataType,
            data,
            timestamp: Date.now(),
            url: data.pageUrl || data.url || 'unknown',
            domain: data.domain || 'unknown'
        };

        // Store in buffer for server sync
        await appendToBuffer(trackingEvent);

        console.log('Tracking data stored:', dataType, data);
    } catch (error) {
        console.error('Error handling tracking data:', error);
    }
}
// Enhanced chart.js with modern functionality and real-time updates

// Global state
let allEvents = [];
let filteredEvents = [];
let currentPage = 1;
const itemsPerPage = 20;
let currentEventIndex = 0;
let chart = null;
let usersChart = null;

// Screenshot pagination state
let allScreenshots = [];
let currentScreenshotPage = 1;
const screenshotsPerPage = 12;

// Productivity insights state
let productivityInsights = null;
let focusPatternsChart = null;

// DOM elements
const searchInput = document.getElementById('searchInput');
const userFilter = document.getElementById('userFilter');
const domainFilter = document.getElementById('domainFilter');
const timeFilter = document.getElementById('timeFilter');
const activityTypeFilter = document.getElementById('activityTypeFilter');
const refreshBtn = document.getElementById('refreshBtn');
const tbody = document.querySelector('#activityTable tbody');
const pagination = document.getElementById('pagination');
const refreshScreenshotsBtn = document.getElementById('refreshScreenshotsBtn');
const screenshotInfo = document.getElementById('screenshotInfo');
const screenshotPagination = document.getElementById('screenshotPagination');
const usersTableBody = document.querySelector('#usersTable tbody');
const screenshotUserFilter = document.getElementById('screenshotUserFilter');
const logoutBtn = document.getElementById('logoutBtn');
const userManagementSection = document.getElementById('userManagementSection');
const userManagementFilter = document.getElementById('userManagementFilter');
const deleteUserBtn = document.getElementById('deleteUserBtn');
const userManagementInfo = document.getElementById('userManagementInfo');

// Productivity insights DOM elements
const productivityUserFilter = document.getElementById('productivityUserFilter');
const productivityPeriodFilter = document.getElementById('productivityPeriodFilter');
const refreshProductivityBtn = document.getElementById('refreshProductivityBtn');
const productivityContent = document.getElementById('productivityContent');
const productivityEmpty = document.getElementById('productivityEmpty');
const productivityScore = document.getElementById('productivityScore');
const focusTime = document.getElementById('focusTime');
const distractionCount = document.getElementById('distractionCount');
const workTimeRatio = document.getElementById('workTimeRatio');
const workDomainsList = document.getElementById('workDomainsList');
const personalDomainsList = document.getElementById('personalDomainsList');
const recommendationsList = document.getElementById('recommendationsList');

// Dark mode elements
const darkModeToggle = document.getElementById('darkModeToggle');
const darkModeIcon = document.getElementById('darkModeIcon');

// Initialize
document.addEventListener('DOMContentLoaded', async() => {
    // Check authentication first
    const authResult = await checkAuthentication();
    if (!authResult.authenticated) {
        window.location.href = '/login';
        return;
    }

    // Update user info in header
    updateUserInfo(authResult.user);

    // Initialize dark mode
    initializeDarkMode();

    loadData();
    loadScreens();
    setupEventListeners();

    // Setup break pattern event listeners
    setupBreakPatternListeners();

    // Initialize user management (only for ADMIN users)
    updateUserManagementVisibility();

    // Auto-refresh every 15 seconds
    setInterval(() => {
        loadScreens();
        updateStats(allEvents);
    }, 15000);
});

function setupEventListeners() {
    searchInput.addEventListener('input', debounce(applyFilters, 300));
    userFilter.addEventListener('change', applyFilters);
    domainFilter.addEventListener('change', applyFilters);
    timeFilter.addEventListener('change', applyFilters);
    if (activityTypeFilter) {
        activityTypeFilter.addEventListener('change', applyFilters);
    }
    refreshBtn.addEventListener('click', () => {
        loadData();
        loadScreens();
    });

    // Export buttons
    const exportAllBtn = document.getElementById('exportAllBtn');
    const exportCSVBtn = document.getElementById('exportCSVBtn');

    if (exportAllBtn) {
        exportAllBtn.addEventListener('click', exportAllData);
    }
    if (exportCSVBtn) {
        exportCSVBtn.addEventListener('click', exportCSV);
    }
    refreshScreenshotsBtn.addEventListener('click', () => {
        loadScreens();
    });
    screenshotUserFilter.addEventListener('change', () => {
        loadScreens();
    });

    // Logout button
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // Productivity insights event listeners
    if (productivityUserFilter) {
        productivityUserFilter.addEventListener('change', loadProductivityInsights);
    }
    if (productivityPeriodFilter) {
        productivityPeriodFilter.addEventListener('change', loadProductivityInsights);
    }
    if (refreshProductivityBtn) {
        refreshProductivityBtn.addEventListener('click', loadProductivityInsights);
    }

    // Dark mode toggle
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', toggleDarkMode);
    }

    // User management event listeners
    if (userManagementFilter) {
        userManagementFilter.addEventListener('change', handleUserManagementSelection);
    }
    if (deleteUserBtn) {
        deleteUserBtn.addEventListener('click', handleDeleteUser);
    }


    // Load users overview
    loadUsersOverview();
}

// Debounce function for search input
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

async function loadData() {
    try {
        showLoading('Loading activity data...');

        const res = await fetch('/api/activity?limit=1000');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const payload = await res.json();
        allEvents = payload.events;

        // Update stats
        updateStats(allEvents);

        // Update status indicators
        updateStatusIndicators(allEvents);

        // Create domain activity chart
        createDomainChart(allEvents);

        // Update productivity user filter
        updateProductivityUserFilter();

        // Update filters
        updateFilterOptions();
        updateScreenshotUserFilterOptions();
        updateUserManagementFilter();
        updateBreakPatternUserFilter();

        // Apply current filters
        applyFilters();

    } catch (error) {
        console.error('Error loading data:', error);
        showError('Failed to load activity data. Please check if the server is running.');
    }
}

function updateStats(inputData) {
    const data = Array.isArray(inputData) ? inputData : (Array.isArray(allEvents) ? allEvents : []);
    const uniqueUsers = new Set(data.map(e => e.username)).size;
    const uniqueDomains = new Set(data.map(e => e.domain)).size;

    document.getElementById('totalEvents').textContent = data.length.toLocaleString();
    document.getElementById('totalUsers').textContent = uniqueUsers.toLocaleString();
    document.getElementById('totalDomains').textContent = uniqueDomains.toLocaleString();
}

function createDomainChart(data) {
    // Aggregate total duration per domain
    const totals = {};
    data.forEach(e => {
        totals[e.domain] = (totals[e.domain] || 0) + e.durationMs;
    });

    // Sort by duration and take top 10
    const sortedDomains = Object.entries(totals)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10);

    const labels = sortedDomains.map(([domain]) => domain);
    const values = sortedDomains.map(([, duration]) => Math.round(duration / 1000 / 60)); // minutes

    // Destroy existing chart
    if (chart) {
        chart.destroy();
    }

    // Create new chart
    const ctx = document.getElementById("domainChart").getContext('2d');
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: "Active Minutes",
                data: values,
                backgroundColor: [
                    'rgba(79, 70, 229, 0.8)',
                    'rgba(124, 58, 237, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                    'rgba(245, 158, 11, 0.8)',
                    'rgba(239, 68, 68, 0.8)',
                    'rgba(59, 130, 246, 0.8)',
                    'rgba(139, 92, 246, 0.8)',
                    'rgba(34, 197, 94, 0.8)',
                    'rgba(251, 146, 60, 0.8)',
                    'rgba(220, 38, 38, 0.8)'
                ],
                borderColor: [
                    'rgba(79, 70, 229, 1)',
                    'rgba(124, 58, 237, 1)',
                    'rgba(16, 185, 129, 1)',
                    'rgba(245, 158, 11, 1)',
                    'rgba(239, 68, 68, 1)',
                    'rgba(59, 130, 246, 1)',
                    'rgba(139, 92, 246, 1)',
                    'rgba(34, 197, 94, 1)',
                    'rgba(251, 146, 60, 1)',
                    'rgba(220, 38, 38, 1)'
                ],
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: 'rgba(79, 70, 229, 1)',
                    borderWidth: 1,
                    cornerRadius: 8,
                    callbacks: {
                        label: function(context) {
                            const minutes = context.parsed.y;
                            const hours = Math.floor(minutes / 60);
                            const remainingMinutes = minutes % 60;
                            return `${hours > 0 ? hours + 'h ' : ''}${remainingMinutes}m`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#6b7280',
                        font: {
                            size: 12
                        }
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    },
                    ticks: {
                        color: '#6b7280',
                        font: {
                            size: 12
                        },
                        callback: function(value) {
                            return value + 'm';
                        }
                    }
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    });
}


function updateFilterOptions() {
    // Update user filter
    const currentUser = userFilter.value;
    const users = [...new Set(allEvents.map(e => e.username))].sort();
    userFilter.innerHTML = '<option value="">All Users</option>';
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user;
        option.textContent = user;
        userFilter.appendChild(option);
    });
    // Restore selected user if it still exists
    if (users.includes(currentUser)) {
        userFilter.value = currentUser;
    }

    // Update domain filter
    const currentDomain = domainFilter.value;
    const domains = [...new Set(allEvents.map(e => e.domain))].sort();
    domainFilter.innerHTML = '<option value="">All Domains</option>';
    domains.forEach(domain => {
        const option = document.createElement('option');
        option.value = domain;
        option.textContent = domain;
        domainFilter.appendChild(option);
    });
    // Restore selected domain if it still exists
    if (domains.includes(currentDomain)) {
        domainFilter.value = currentDomain;
    }
}

function updateScreenshotUserFilterOptions() {
    if (!screenshotUserFilter) return;
    const current = screenshotUserFilter.value;

    // Get users from both activity events and screenshots
    const eventUsers = allEvents.map(e => e.username);
    const screenshotUsers = allScreenshots.map(s => {
        // Extract username from screenshot filename (format: timestamp_deviceIdHash_username_domain.png)
        const base = s.filename.replace('.png', '');
        const parts = base.split('_');
        return parts.length >= 3 ? parts[2] : null;
    }).filter(Boolean);

    const users = [...new Set([...eventUsers, ...screenshotUsers])].sort();
    screenshotUserFilter.innerHTML = '<option value="">All Users</option>';
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user;
        option.textContent = user;
        screenshotUserFilter.appendChild(option);
    });
    if (users.includes(current)) {
        screenshotUserFilter.value = current;
    }
}

function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const selectedUser = userFilter.value;
    const selectedDomain = domainFilter.value;
    const selectedTime = timeFilter.value;
    const selectedActivityType = activityTypeFilter ? activityTypeFilter.value : '';

    filteredEvents = allEvents.filter(event => {
        const matchesSearch = !searchTerm ||
            event.username.toLowerCase().includes(searchTerm) ||
            event.domain.toLowerCase().includes(searchTerm) ||
            (event.reason && event.reason.toLowerCase().includes(searchTerm)) ||
            (event.data.application && event.data.application.toLowerCase().includes(searchTerm));

        const matchesUser = !selectedUser || event.username === selectedUser;
        const matchesDomain = !selectedDomain || event.domain === selectedDomain;
        const matchesActivityType = !selectedActivityType || event.type === selectedActivityType;

        const matchesTime = !selectedTime || isWithinTimeRange(event.timestamp, selectedTime);

        return matchesSearch && matchesUser && matchesDomain && matchesActivityType && matchesTime;
    });

    currentPage = 1;
    renderTable();
    renderPagination();
}

function isWithinTimeRange(timestamp, range) {
    const now = new Date();
    const eventTime = new Date(timestamp);

    switch (range) {
        case 'today':
            return eventTime.toDateString() === now.toDateString();
        case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return eventTime >= weekAgo;
        case 'month':
            const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            return eventTime >= monthAgo;
        default:
            return true;
    }
}

function getSourceInfo(event) {
    // Determine source based on domain and event type
    if (event.domain === 'windows-desktop') {
        return {
            text: 'Windows App',
            icon: '🖥️',
            class: 'source-windows'
        };
    } else if (event.domain && event.domain !== 'windows-desktop') {
        return {
            text: 'Chrome Extension',
            icon: '🌐',
            class: 'source-extension'
        };
    } else {
        return {
            text: 'Unknown',
            icon: '❓',
            class: 'source-unknown'
        };
    }
}

function getActivityDescription(event) {
    // If no data field, return the reason
    if (!event.data) {
        return event.reason || 'Active';
    }

    // Handle different activity types
    switch (event.type) {
        case 'window_activity':
            if (event.data.application) {
                return `Using ${event.data.application}`;
            }
            break;

        case 'clipboard':
            if (event.data.type) {
                return `Copied ${event.data.type}`;
            } else if (event.data.content) {
                const preview = event.data.content.substring(0, 20);
                return `Copied: ${preview}${event.data.content.length > 20 ? '...' : ''}`;
            }
            break;

        case 'screenshot':
            return `Screenshot: ${event.data.reason || 'captured'}`;

        case 'formInteraction':
            return `Form: ${event.data.action} ${event.data.fieldType}`;

        case 'contentStructure':
            return `Page: ${event.data.title || 'Unknown'}`;

        case 'userBehavior':
            return `Action: ${event.data.action}`;

        default:
            // Try to extract meaningful info from data
            if (event.data.application) {
                return `App: ${event.data.application}`;
            } else if (event.data.title) {
                return event.data.title;
            } else if (event.data.action) {
                return event.data.action;
            }
    }

    // Fallback to reason
    return event.reason || 'Active';
}

function getApplicationInfo(event) {
    // Check multiple possible locations for application info
    let appName = null;

    // Check event.data.application first
    if (event.data && event.data.application) {
        appName = event.data.application;
    }
    // Check event.data.app as alternative
    else if (event.data && event.data.app) {
        appName = event.data.app;
    }
    // Check event.data.windowTitle for clues
    else if (event.data && event.data.windowTitle) {
        const title = event.data.windowTitle.toLowerCase();
        if (title.includes('chrome')) appName = 'Chrome';
        else if (title.includes('firefox')) appName = 'Firefox';
        else if (title.includes('safari')) appName = 'Safari';
        else if (title.includes('edge')) appName = 'Edge';
        else if (title.includes('code') || title.includes('vscode')) appName = 'VS Code';
        else if (title.includes('cursor')) appName = 'Cursor';
        else if (title.includes('electron')) appName = 'Electron';
        else if (title.includes('terminal') || title.includes('cmd')) appName = 'Terminal';
    }
    // Check event.data.url for browser clues
    else if (event.data && event.data.url) {
        const url = event.data.url.toLowerCase();
        if (url.includes('chrome://')) appName = 'Chrome';
        else if (url.includes('about:') || url.includes('moz-extension://')) appName = 'Firefox';
        else if (url.includes('safari://')) appName = 'Safari';
        else if (url.includes('edge://')) appName = 'Edge';
    }
    // Check event type for clues
    else if (event.type === 'screenshot') {
        appName = 'Screenshot Tool';
    } else if (event.type === 'clipboard') {
        appName = 'Clipboard';
    } else if (event.type === 'window_activity') {
        appName = 'Window Manager';
    }

    if (appName) {
        const app = appName.toLowerCase();
        if (app.includes('chrome') || app.includes('google chrome')) {
            return { name: 'Chrome', icon: '🌐' };
        } else if (app.includes('firefox')) {
            return { name: 'Firefox', icon: '🦊' };
        } else if (app.includes('safari')) {
            return { name: 'Safari', icon: '🧭' };
        } else if (app.includes('edge')) {
            return { name: 'Edge', icon: '🌊' };
        } else if (app.includes('code') || app.includes('vscode')) {
            return { name: 'VS Code', icon: '💻' };
        } else if (app.includes('cursor')) {
            return { name: 'Cursor', icon: '🎯' };
        } else if (app.includes('electron')) {
            return { name: 'Electron', icon: '⚡' };
        } else if (app.includes('terminal') || app.includes('cmd')) {
            return { name: 'Terminal', icon: '💻' };
        } else if (app.includes('screenshot')) {
            return { name: 'Screenshot', icon: '📸' };
        } else if (app.includes('clipboard')) {
            return { name: 'Clipboard', icon: '📋' };
        } else if (app.includes('window')) {
            return { name: 'Window Manager', icon: '🪟' };
        } else {
            return { name: appName, icon: '🖥️' };
        }
    }

    // Fallback based on domain
    if (event.domain) {
        const domain = event.domain.toLowerCase();
        if (domain.includes('google.com') || domain.includes('youtube.com') || domain.includes('gmail.com')) {
            return { name: 'Browser', icon: '🌐' };
        } else if (domain.includes('github.com')) {
            return { name: 'GitHub', icon: '🐙' };
        } else if (domain.includes('stackoverflow.com')) {
            return { name: 'Stack Overflow', icon: '📚' };
        } else if (domain === 'windows-desktop') {
            return { name: 'Desktop', icon: '🖥️' };
        }
    }

    return { name: 'Unknown', icon: '❓' };
}

function getActivityTypeInfo(event) {
    if (event.type === 'window_activity') {
        return { text: 'Window Activity', icon: '🪟' };
    } else if (event.type === 'form_interaction') {
        return { text: 'Form Interaction', icon: '📝' };
    } else if (event.type === 'click') {
        return { text: 'Click', icon: '👆' };
    } else if (event.type === 'keypress') {
        return { text: 'Keypress', icon: '⌨️' };
    } else if (event.type === 'scroll') {
        return { text: 'Scroll', icon: '📜' };
    } else if (event.type === 'screenshot') {
        return { text: 'Screenshot', icon: '📸' };
    } else if (event.type === 'clipboard') {
        return { text: 'Clipboard', icon: '📋' };
    } else {
        return { text: event.type || 'Activity', icon: '📊' };
    }
}

function formatDuration(seconds) {
    // Handle very small durations with more detail
    if (seconds < 0.1) {
        return '0s';
    } else if (seconds < 1) {
        return `${Math.round(seconds * 10) / 10}s`;
    } else if (seconds < 60) {
        return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.round(seconds % 60);
        return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    } else {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
}

function renderTable() {
    tbody.innerHTML = '';

    if (filteredEvents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state"><i class="fas fa-search"></i><br>No events found</td></tr>';
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageEvents = filteredEvents.slice(startIndex, endIndex);

    pageEvents.forEach((e, index) => {
        const tr = document.createElement('tr');
        const t = new Date(e.timestamp).toLocaleString();

        // Calculate duration - use durationMs if available, otherwise estimate from time between events
        let duration = Math.round((e.durationMs || 0) / 1000);

        // If duration is 0 or very small, try to calculate from next event
        if (duration < 1 && index < pageEvents.length - 1) {
            const nextEvent = pageEvents[index + 1];
            const timeDiff = (new Date(nextEvent.timestamp) - new Date(e.timestamp)) / 1000;
            if (timeDiff > 0 && timeDiff < 300) { // Only use if reasonable (less than 5 minutes)
                duration = Math.round(timeDiff);
            }
        }

        // Fallback: if still no duration, use a default based on event type
        if (duration < 1) {
            if (e.type === 'screenshot') {
                duration = 1; // Screenshots take about 1 second
            } else if (e.type === 'window_activity') {
                duration = 5; // Window activities are typically 5+ seconds
            } else {
                duration = 1; // Default 1 second
            }
        }

        const source = getSourceInfo(e);
        const application = getApplicationInfo(e);
        const activityType = getActivityTypeInfo(e);

        // Debug: Log duration values for first few events
        if (startIndex + index < 3) {
            console.log(`Event ${startIndex + index}: durationMs=${e.durationMs}, calculated duration=${duration}s, type=${e.type}`);
        }

        tr.innerHTML = `
            <td class="time-cell">${t}</td>
            <td class="user-cell"><span class="user-badge">${e.username || 'Unknown'}</span></td>
            <td class="application-cell"><span class="application-badge">${application.icon} ${application.name}</span></td>
            <td class="domain-cell"><a href="https://${e.domain}" target="_blank" class="domain-link">${e.domain}</a></td>
            <td class="activity-type-cell"><span class="activity-type-badge">${activityType.icon} ${activityType.text}</span></td>
            <td class="duration-cell"><span class="duration-badge">${formatDuration(duration)}</span></td>
            <td class="details-cell"><span class="reason-badge">${getActivityDescription(e)}</span></td>
            <td class="actions-cell">
                <button class="view-details-btn" onclick="showEventDetails(${startIndex + index})">
                    <i class="fas fa-eye"></i> View
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}





function renderPagination() {
    const totalPages = Math.ceil(filteredEvents.length / itemsPerPage);
    pagination.innerHTML = '';

    if (totalPages <= 1) return;

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i> Previous';
    prevBtn.disabled = currentPage === 1;
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderTable();
            renderPagination();
        }
    });
    pagination.appendChild(prevBtn);

    // Page numbers
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, currentPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = i === currentPage ? 'active' : '';
        pageBtn.addEventListener('click', () => {
            currentPage = i;
            renderTable();
            renderPagination();
        });
        pagination.appendChild(pageBtn);
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.addEventListener('click', () => {
        if (currentPage < totalPages) {
            currentPage++;
            renderTable();
            renderPagination();
        }
    });
    pagination.appendChild(nextBtn);

    // Page info
    const info = document.createElement('span');
    info.textContent = `Page ${currentPage} of ${totalPages} (${filteredEvents.length.toLocaleString()} total events)`;
    info.style.marginLeft = '15px';
    info.style.color = '#6b7280';
    info.style.fontSize = '14px';
    pagination.appendChild(info);
}

async function loadScreens() {
    try {
        const user = encodeURIComponent(screenshotUserFilter.value || '');
        const res = await fetch(`/api/screenshots?limit=1000${user ? `&user=${user}` : ''}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const payload = await res.json();
        allScreenshots = payload.files;
        currentScreenshotPage = 1;

        document.getElementById('totalScreenshots').textContent = payload.count.toLocaleString();
        renderScreenshots();
        renderScreenshotPagination();
        
        // Update screenshot user filter options to include any new users from screenshots
        updateScreenshotUserFilterOptions();
    } catch (error) {
        console.error('Error loading screenshots:', error);
        document.getElementById('shots').innerHTML = '<div class="error">Failed to load screenshots</div>';
    }
}

function renderScreenshots() {
    const container = document.getElementById('shots');
    container.innerHTML = '';

    if (allScreenshots.length === 0) {
        container.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;"><i class="fas fa-camera"></i><br>No screenshots found</div>';
        return;
    }

    const startIndex = (currentScreenshotPage - 1) * screenshotsPerPage;
    const endIndex = startIndex + screenshotsPerPage;
    const pageScreenshots = allScreenshots.slice(startIndex, endIndex);

    pageScreenshots.forEach(f => {
        const item = document.createElement('div');
        item.className = 'screenshot-item';

        const img = document.createElement('img');
        img.src = f.url;
        img.loading = 'lazy';
        img.onerror = () => {
            // Show placeholder image
            img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjE1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZGRkIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPkltYWdlIG5vdCBmb3VuZDwvdGV4dD48L3N2Zz4=';
            img.style.opacity = '0.5';
            // Mark as failed to prevent infinite re-rendering
            f.failed = true;
        };

        const info = document.createElement('div');
        info.className = 'screenshot-info';

        const filename = document.createElement('div');
        filename.className = 'screenshot-filename';
        filename.textContent = f.filename;

        const meta = document.createElement('div');
        meta.className = 'screenshot-meta';
        const time = new Date(f.mtime).toLocaleString();
        meta.innerHTML = `
            <span><i class="fas fa-user"></i> ${f.username || ''}</span>
            <span><i class="fas fa-clock"></i> ${time}</span>
        `;

        info.appendChild(filename);
        info.appendChild(meta);
        item.appendChild(img);
        item.appendChild(info);

        // Add click to open in new tab
        item.addEventListener('click', () => {
            window.open(f.url, '_blank');
        });

        container.appendChild(item);
    });

    // Update screenshot info
    const totalPages = Math.ceil(allScreenshots.length / screenshotsPerPage);
    screenshotInfo.textContent = `Page ${currentScreenshotPage} of ${totalPages} (${allScreenshots.length.toLocaleString()} total screenshots)`;
}

function renderScreenshotPagination() {
    const totalPages = Math.ceil(allScreenshots.length / screenshotsPerPage);
    screenshotPagination.innerHTML = '';

    if (totalPages <= 1) return;

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.innerHTML = '<i class="fas fa-chevron-left"></i> Previous';
    prevBtn.disabled = currentScreenshotPage === 1;
    prevBtn.addEventListener('click', () => {
        if (currentScreenshotPage > 1) {
            currentScreenshotPage--;
            renderScreenshots();
            renderScreenshotPagination();
        }
    });
    screenshotPagination.appendChild(prevBtn);

    // Page numbers
    const startPage = Math.max(1, currentScreenshotPage - 2);
    const endPage = Math.min(totalPages, currentScreenshotPage + 2);

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = i === currentScreenshotPage ? 'active' : '';
        pageBtn.addEventListener('click', () => {
            currentScreenshotPage = i;
            renderScreenshots();
            renderScreenshotPagination();
        });
        screenshotPagination.appendChild(pageBtn);
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.innerHTML = 'Next <i class="fas fa-chevron-right"></i>';
    nextBtn.disabled = currentScreenshotPage === totalPages;
    nextBtn.addEventListener('click', () => {
        if (currentScreenshotPage < totalPages) {
            currentScreenshotPage++;
            renderScreenshots();
            renderScreenshotPagination();
        }
    });
    screenshotPagination.appendChild(nextBtn);
}


function showLoading(message) {
    // You can implement a loading overlay here
    console.log('Loading:', message);
}

function showError(message) {
    // You can implement error toast notifications here
    console.error('Error:', message);
}

function showSuccessMessage(message) {
    // You can implement success toast notifications here
    console.log('Success:', message);
}

function showErrorMessage(message) {
    // You can implement error toast notifications here
    console.error('Error:', message);
}

// Config helpers

// Users overview
async function loadUsersOverview() {
    try {
        const res = await fetch('/api/analytics/users');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload = await res.json();
        const users = Array.isArray(payload.users) ? payload.users : [];

        // Render table
        renderUsersTable(users);
        // Render top users chart
        renderUsersChart(users);
    } catch (e) {
        console.error('Failed to load users overview', e);
        if (usersTableBody) {
            usersTableBody.innerHTML = '<tr><td colspan="6" class="error">Failed to load users</td></tr>';
        }
    }
}

function renderUsersTable(users) {
    if (!usersTableBody) return;
    if (!users.length) {
        usersTableBody.innerHTML = '<tr><td colspan="6" class="empty-state">No user data</td></tr>';
        return;
    }
    usersTableBody.innerHTML = '';
    // Sort by total time desc
    const sorted = [...users].sort((a, b) => (b.totalTime || 0) - (a.totalTime || 0));

    sorted.forEach(u => {
        const tr = document.createElement('tr');
        const minutes = Math.round((u.totalTime || 0) / 60000);
        const last = u.lastActivity ? new Date(u.lastActivity).toLocaleString() : '—';
        const status = getUserStatus(u.lastActivity);
        tr.innerHTML = `
            <td><button class="user-badge user-name" data-user="${escapeHtml(u.username)}" style="background:#e0e7ff;border:none;cursor:pointer;">${escapeHtml(u.username)}</button></td>
            <td><span class="user-status ${status}">${status}</span></td>
            <td class="user-time"><span class="duration-badge">${minutes}m</span></td>
            <td class="user-time">${u.uniqueDomains || (u.domains ? u.domains.length : 0)}</td>
            <td class="user-time">${u.eventCount || 0}</td>
            <td class="user-time">${last}</td>
        `;
        usersTableBody.appendChild(tr);
    });

    // Click to filter by user
    usersTableBody.querySelectorAll('button[data-user]').forEach(btn => {
        btn.addEventListener('click', () => {
            const user = btn.getAttribute('data-user');
            userFilter.value = user;
            applyFilters();
            // Scroll to log
            document.getElementById('activityTable').scrollIntoView({ behavior: 'smooth' });
            if (screenshotUserFilter) {
                screenshotUserFilter.value = user;
                loadScreens();
            }
        });
    });
}

function renderUsersChart(users) {
    const canvas = document.getElementById('usersChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const top = [...users]
        .sort((a, b) => (b.totalTime || 0) - (a.totalTime || 0))
        .slice(0, 7);
    const labels = top.map(u => u.username);
    const values = top.map(u => Math.round((u.totalTime || 0) / 60000));

    if (usersChart) usersChart.destroy();
    usersChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Active Minutes (Top Users)',
                data: values,
                backgroundColor: 'rgba(16, 185, 129, 0.8)',
                borderColor: 'rgba(5, 150, 105, 1)',
                borderWidth: 2,
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { 
                    grid: { display: false }, 
                    ticks: { color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#cbd5e1' : '#6b7280' } 
                },
                y: { 
                    beginAtZero: true, 
                    grid: { color: document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0,0,0,0.05)' }, 
                    ticks: { 
                        color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#cbd5e1' : '#6b7280', 
                        callback: v => v + 'm' 
                    } 
                }
            }
        }
    });
}

function getUserStatus(lastActivityIso) {
    if (!lastActivityIso) return 'offline';
    const last = new Date(lastActivityIso).getTime();
    const diffMin = (Date.now() - last) / 60000;
    if (diffMin < 5) return 'active';
    if (diffMin < 30) return 'idle';
    return 'offline';
}

function escapeHtml(str) {
    return String(str).replace(/[&<>\"]+/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[s]));
}

// Authentication functions
async function checkAuthentication() {
    try {
        const response = await fetch('/api/auth/status');
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Auth check error:', error);
        return { authenticated: false };
    }
}

function updateUserInfo(user) {
    const currentUserEl = document.getElementById('currentUser');
    const userRoleEl = document.getElementById('userRole');
    
    if (currentUserEl) {
        currentUserEl.textContent = user.username;
    }
    
    if (userRoleEl) {
        userRoleEl.textContent = user.role;
        userRoleEl.style.background = user.role === 'ADMIN' ? '#ef4444' : '#4f46e5';
    }
    
    // Update user management visibility based on role
    updateUserManagementVisibility();
}

async function handleLogout() {
    try {
        const response = await fetch('/api/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        
        if (response.ok) {
            window.location.href = '/login';
        } else {
            console.error('Logout failed');
            // Force redirect anyway
            window.location.href = '/login';
        }
    } catch (error) {
        console.error('Logout error:', error);
        // Force redirect anyway
        window.location.href = '/login';
    }
}

// Productivity Insights Functions
async function loadProductivityInsights() {
    const username = productivityUserFilter?.value;
    const period = productivityPeriodFilter?.value || 'week';
    
    if (!username) {
        if (productivityContent) productivityContent.style.display = 'none';
        if (productivityEmpty) productivityEmpty.style.display = 'block';
        return;
    }

    try {
        showLoading('Loading productivity insights...');
        
        const response = await fetch(`/api/analytics/productivity/${encodeURIComponent(username)}?period=${period}`);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const insights = await response.json();
        productivityInsights = insights;
        
        updateProductivityUI(insights);
        
        if (productivityContent) productivityContent.style.display = 'block';
        if (productivityEmpty) productivityEmpty.style.display = 'none';
        
    } catch (error) {
        console.error('Error loading productivity insights:', error);
        showError('Failed to load productivity insights');
    }
}

function updateProductivityUI(insights) {
    // Update productivity score
    if (productivityScore) {
        productivityScore.textContent = insights.productivityScore || 0;
        productivityScore.style.color = getScoreColor(insights.productivityScore);
    }
    
    // Update focus time
    if (focusTime) {
        focusTime.textContent = formatTime(insights.focusTime || 0);
    }
    
    // Update distraction count
    if (distractionCount) {
        distractionCount.textContent = insights.distractionCount || 0;
    }
    
    // Update work time ratio
    if (workTimeRatio) {
        workTimeRatio.textContent = `${insights.workTimeRatio || 0}%`;
    }
    
    // Update domain lists
    updateDomainList(workDomainsList, insights.workDomains || [], 'work');
    updateDomainList(personalDomainsList, insights.personalDomains || [], 'personal');
    
    // Update recommendations
    updateRecommendations(insights.recommendations || []);
    
    // Update focus patterns chart
    updateFocusPatternsChart(insights.focusPatterns || []);
}

function getScoreColor(score) {
    if (score >= 80) return '#10b981'; // Green
    if (score >= 60) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
}

function formatTime(minutes) {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function updateDomainList(container, domains, type) {
    if (!container) return;
    
    container.innerHTML = '';
    
    if (domains.length === 0) {
        container.innerHTML = '<div style="color: #6b7280; font-style: italic;">No domains found</div>';
        return;
    }
    
    domains.forEach(domain => {
        const domainElement = document.createElement('div');
        domainElement.style.cssText = `
            padding: 4px 8px;
            margin: 2px 0;
            background: ${type === 'work' ? '#dbeafe' : '#fee2e2'};
            border-radius: 4px;
            font-size: 12px;
            color: ${type === 'work' ? '#1e40af' : '#dc2626'};
            word-break: break-all;
        `;
        domainElement.textContent = domain;
        container.appendChild(domainElement);
    });
}

function updateRecommendations(recommendations) {
    if (!recommendationsList) return;
    
    recommendationsList.innerHTML = '';
    
    if (recommendations.length === 0) {
        recommendationsList.innerHTML = '<div style="color: #6b7280; font-style: italic;">No recommendations available</div>';
        return;
    }
    
    recommendations.forEach(rec => {
        const recElement = document.createElement('div');
        recElement.style.cssText = `
            padding: 8px 12px;
            margin: 4px 0;
            background: #f1f5f9;
            border-left: 3px solid #3b82f6;
            border-radius: 4px;
            font-size: 14px;
            color: #1e293b;
        `;
        recElement.innerHTML = `<i class="fas fa-lightbulb" style="margin-right: 8px; color: #f59e0b;"></i>${rec}`;
        recommendationsList.appendChild(recElement);
    });
}

function updateFocusPatternsChart(patterns) {
    if (!patterns || patterns.length === 0) return;
    
    const ctx = document.getElementById('focusPatternsChart');
    if (!ctx) return;
    
    // Destroy existing chart
    if (focusPatternsChart) {
        focusPatternsChart.destroy();
    }
    
    const hours = patterns.map(p => `${p.hour}:00`);
    const workData = patterns.map(p => p.workTime);
    const personalData = patterns.map(p => p.personalTime);
    
    focusPatternsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hours,
            datasets: [
                {
                    label: 'Work Time (min)',
                    data: workData,
                    backgroundColor: 'rgba(59, 130, 246, 0.8)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1
                },
                {
                    label: 'Personal Time (min)',
                    data: personalData,
                    backgroundColor: 'rgba(239, 68, 68, 0.8)',
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Time (minutes)',
                        color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#cbd5e1' : '#6b7280'
                    },
                    ticks: {
                        color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#cbd5e1' : '#6b7280'
                    },
                    grid: {
                        color: document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Hour of Day',
                        color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#cbd5e1' : '#6b7280'
                    },
                    ticks: {
                        color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#cbd5e1' : '#6b7280'
                    },
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: document.documentElement.getAttribute('data-theme') === 'dark' ? '#cbd5e1' : '#6b7280'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                }
            }
        }
    });
}

// Update productivity user filter when users are loaded
function updateProductivityUserFilter() {
    if (!productivityUserFilter) return;
    
    const currentUser = productivityUserFilter.value;
    const users = [...new Set(allEvents.map(e => e.username))].sort();
    
    productivityUserFilter.innerHTML = '<option value="">Select User</option>';
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user;
        option.textContent = user;
        productivityUserFilter.appendChild(option);
    });
    
    if (users.includes(currentUser)) {
        productivityUserFilter.value = currentUser;
    }
}

// Dark Mode Functions
function initializeDarkMode() {
    // Check for saved theme preference or default to light mode
    const savedTheme = localStorage.getItem('theme') || 'light';
    setTheme(savedTheme);
}

function toggleDarkMode() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    
    if (darkModeIcon) {
        if (theme === 'dark') {
            darkModeIcon.className = 'fas fa-sun';
            darkModeToggle.title = 'Switch to Light Mode';
        } else {
            darkModeIcon.className = 'fas fa-moon';
            darkModeToggle.title = 'Switch to Dark Mode';
        }
    }
    
    // Update chart colors for dark mode
    updateChartColors(theme);
}

function updateChartColors(theme) {
    // Update existing charts if they exist
    if (chart && chart.options) {
        if (theme === 'dark') {
            chart.options.scales.x.ticks.color = '#cbd5e1';
            chart.options.scales.y.ticks.color = '#cbd5e1';
            chart.options.scales.y.grid.color = 'rgba(255, 255, 255, 0.1)';
        } else {
            chart.options.scales.x.ticks.color = '#6b7280';
            chart.options.scales.y.ticks.color = '#6b7280';
            chart.options.scales.y.grid.color = 'rgba(0, 0, 0, 0.05)';
        }
        chart.update();
    }
    
    if (usersChart && usersChart.options) {
        if (theme === 'dark') {
            usersChart.options.scales.x.ticks.color = '#cbd5e1';
            usersChart.options.scales.y.ticks.color = '#cbd5e1';
            usersChart.options.scales.y.grid.color = 'rgba(255, 255, 255, 0.1)';
        } else {
            usersChart.options.scales.x.ticks.color = '#6b7280';
            usersChart.options.scales.y.ticks.color = '#6b7280';
            usersChart.options.scales.y.grid.color = 'rgba(0, 0, 0, 0.05)';
        }
        usersChart.update();
    }
    
    if (focusPatternsChart && focusPatternsChart.options) {
        if (theme === 'dark') {
            focusPatternsChart.options.scales.x.ticks.color = '#cbd5e1';
            focusPatternsChart.options.scales.y.ticks.color = '#cbd5e1';
            focusPatternsChart.options.scales.x.title.color = '#cbd5e1';
            focusPatternsChart.options.scales.y.title.color = '#cbd5e1';
        } else {
            focusPatternsChart.options.scales.x.ticks.color = '#6b7280';
            focusPatternsChart.options.scales.y.ticks.color = '#6b7280';
            focusPatternsChart.options.scales.x.title.color = '#6b7280';
            focusPatternsChart.options.scales.y.title.color = '#6b7280';
        }
        focusPatternsChart.update();
    }
}

// User Management Functions
function updateUserManagementVisibility() {
    if (userManagementSection) {
        // Show user management section only for ADMIN users
        const userRole = document.getElementById('userRole');
        if (userRole && userRole.textContent === 'ADMIN') {
            userManagementSection.style.display = 'block';
            updateUserManagementFilter();
        } else {
            userManagementSection.style.display = 'none';
        }
    }
}

function updateUserManagementFilter() {
    if (!userManagementFilter) return;
    
    const currentUser = userManagementFilter.value;
    const users = [...new Set(allEvents.map(e => e.username))].sort();
    
    userManagementFilter.innerHTML = '<option value="">Select User to Manage</option>';
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user;
        option.textContent = user;
        userManagementFilter.appendChild(option);
    });
    
    // Restore selected user if it still exists
    if (users.includes(currentUser)) {
        userManagementFilter.value = currentUser;
        handleUserManagementSelection();
    }
}

function updateBreakPatternUserFilter() {
    const breakUserFilter = document.getElementById('breakUserFilter');
    if (!breakUserFilter) return;
    
    const currentUser = breakUserFilter.value;
    const users = [...new Set(allEvents.map(e => e.username))].sort();
    
    breakUserFilter.innerHTML = '<option value="">Select User</option>';
    users.forEach(user => {
        const option = document.createElement('option');
        option.value = user;
        option.textContent = user;
        breakUserFilter.appendChild(option);
    });
    
    // Restore selected user if it still exists
    if (users.includes(currentUser)) {
        breakUserFilter.value = currentUser;
    }
}

async function handleUserManagementSelection() {
    const selectedUser = userManagementFilter.value;
    
    if (!selectedUser) {
        deleteUserBtn.disabled = true;
        userManagementInfo.innerHTML = '<p>Select a user to view their data and management options.</p>';
        return;
    }
    
    try {
        // Get user data statistics
        const userEvents = allEvents.filter(e => e.username === selectedUser);
        const userScreenshots = allScreenshots.filter(s => s.filename && s.filename.includes(selectedUser));
        
        const totalTime = userEvents.reduce((sum, e) => sum + (e.durationMs || 0), 0);
        const totalMinutes = Math.round(totalTime / 60000);
        const uniqueDomains = [...new Set(userEvents.map(e => e.domain))].length;
        
        userManagementInfo.innerHTML = `
            <h4>User Data Summary: ${escapeHtml(selectedUser)}</h4>
            <p><strong>Total Activity Time:</strong> ${totalMinutes} minutes</p>
            <p><strong>Activity Events:</strong> ${userEvents.length}</p>
            <p><strong>Unique Domains:</strong> ${uniqueDomains}</p>
            <p><strong>Screenshots:</strong> ${userScreenshots.length}</p>
            <p style="color: #ef4444; font-weight: 600; margin-top: 15px;">
                ⚠️ Deleting user data will permanently remove all activity logs and screenshots for this user.
            </p>
        `;
        
        deleteUserBtn.disabled = false;
    } catch (error) {
        console.error('Error loading user data:', error);
        userManagementInfo.innerHTML = '<p style="color: #ef4444;">Error loading user data.</p>';
        deleteUserBtn.disabled = true;
    }
}

async function handleDeleteUser() {
    const selectedUser = userManagementFilter.value;
    
    if (!selectedUser) {
        alert('Please select a user to delete.');
        return;
    }
    
    // Confirmation dialog
    const confirmed = confirm(
        `Are you sure you want to delete ALL data for user "${selectedUser}"?\n\n` +
        'This will permanently delete:\n' +
        '• All activity logs\n' +
        '• All screenshots\n' +
        '• All productivity data\n\n' +
        'This action cannot be undone!'
    );
    
    if (!confirmed) return;
    
    try {
        showLoading('Deleting user data...');
        
        const response = await fetch(`/api/admin/delete-user/${encodeURIComponent(selectedUser)}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }
        
        const result = await response.json();
        
        // Reset UI
        userManagementFilter.value = '';
        deleteUserBtn.disabled = true;
        userManagementInfo.innerHTML = '<p>User data deleted successfully. Select another user to manage.</p>';
        
        // Clear any active filters that might be showing deleted user data
        if (userFilter) userFilter.value = '';
        if (screenshotUserFilter) screenshotUserFilter.value = '';
        if (productivityUserFilter) productivityUserFilter.value = '';
        
        // Refresh all data from server
        await loadData();
        await loadScreens();
        
        // Update all filters with fresh data
        updateUserManagementFilter();
        updateFilterOptions();
        updateScreenshotUserFilterOptions();
        updateProductivityUserFilter();
        
        // Clean up any failed screenshots
        allScreenshots = allScreenshots.filter(s => !s.failed);
        
        // Reapply filters to refresh the display
        applyFilters();
        renderScreenshots();
        
        showSuccessMessage(`Successfully deleted all data for user "${selectedUser}"`);
        
    } catch (error) {
        console.error('Error deleting user data:', error);
        showError(`Failed to delete user data: ${error.message}`);
    }
}

// Break Pattern Analysis Functions
function setupBreakPatternListeners() {
    const loadBreakPatternsBtn = document.getElementById('loadBreakPatterns');
    if (loadBreakPatternsBtn) {
        loadBreakPatternsBtn.addEventListener('click', loadBreakPatterns);
    }
}

async function loadBreakPatterns() {
    const userFilter = document.getElementById('breakUserFilter');
    const periodFilter = document.getElementById('breakPeriodFilter');
    const content = document.getElementById('breakPatternsContent');
    
    if (!userFilter || !periodFilter || !content) return;
    
    const selectedUser = userFilter.value;
    const selectedPeriod = periodFilter.value;
    
    if (!selectedUser) {
        showErrorMessage('Please select a user to analyze break patterns');
        return;
    }
    
    try {
        content.style.display = 'block';
        
        // Show loading state
        const loadBtn = document.getElementById('loadBreakPatterns');
        if (loadBtn) {
            loadBtn.disabled = true;
            loadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
        }
        
        const response = await fetch(`/api/analytics/breaks/${selectedUser}?period=${selectedPeriod}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.success) {
            displayBreakPatterns(data.analysis);
        } else {
            throw new Error(data.error || 'Failed to load break patterns');
        }
        
    } catch (error) {
        console.error('Error loading break patterns:', error);
        showErrorMessage('Failed to load break patterns: ' + error.message);
    } finally {
        // Reset button state
        const loadBtn = document.getElementById('loadBreakPatterns');
        if (loadBtn) {
            loadBtn.disabled = false;
            loadBtn.innerHTML = '<i class="fas fa-chart-bar"></i> Analyze Breaks';
        }
    }
}

function displayBreakPatterns(analysis) {
    // Update statistics
    document.getElementById('totalBreaks').textContent = analysis.totalBreaks;
    document.getElementById('avgBreakLength').textContent = analysis.averageBreakLength + ' min';
    document.getElementById('breakFrequency').textContent = analysis.breakFrequency + '/day';
    document.getElementById('totalBreakTime').textContent = analysis.totalBreakTime + ' min';
    
    // Create break patterns chart
    createBreakPatternsChart(analysis.hourlyBreakDistribution);
    
    // Display recommendations
    displayBreakRecommendations(analysis.breakRecommendations);
    
    // Display recent breaks
    displayRecentBreaks(analysis.dailyBreaks);
}

function createBreakPatternsChart(hourlyDistribution) {
    const canvas = document.getElementById('breakPatternsChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Clear previous chart
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Prepare data for 24 hours
    const hours = Array.from({length: 24}, (_, i) => i);
    const breakCounts = hours.map(hour => hourlyDistribution[hour] || 0);
    
    // Chart dimensions
    const padding = 40;
    const chartWidth = canvas.width - 2 * padding;
    const chartHeight = canvas.height - 2 * padding;
    const barWidth = chartWidth / 24;
    
    // Find max value for scaling
    const maxBreaks = Math.max(...breakCounts, 1);
    
    // Draw bars
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--primary-color') || '#3b82f6';
    
    breakCounts.forEach((count, index) => {
        const barHeight = (count / maxBreaks) * chartHeight;
        const x = padding + index * barWidth;
        const y = padding + chartHeight - barHeight;
        
        ctx.fillRect(x, y, barWidth - 2, barHeight);
    });
    
    // Draw axes
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#6b7280';
    ctx.lineWidth = 1;
    
    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding, padding + chartHeight);
    ctx.lineTo(padding + chartWidth, padding + chartHeight);
    ctx.stroke();
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, padding + chartHeight);
    ctx.stroke();
    
    // Draw hour labels
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-secondary') || '#6b7280';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    
    for (let i = 0; i < 24; i += 4) {
        const x = padding + i * barWidth + barWidth / 2;
        ctx.fillText(i + ':00', x, padding + chartHeight + 20);
    }
    
    // Draw value labels
    ctx.textAlign = 'right';
    ctx.fillText('0', padding - 5, padding + chartHeight);
    ctx.fillText(maxBreaks.toString(), padding - 5, padding + 5);
}

function displayBreakRecommendations(recommendations) {
    const container = document.getElementById('breakRecommendationsList');
    if (!container) return;
    
    if (recommendations.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); font-style: italic;">No specific recommendations at this time. Your break patterns look good!</p>';
        return;
    }
    
    const list = document.createElement('ul');
    recommendations.forEach(rec => {
        const li = document.createElement('li');
        li.textContent = rec;
        list.appendChild(li);
    });
    
    container.innerHTML = '';
    container.appendChild(list);
}

function displayRecentBreaks(dailyBreaks) {
    const container = document.getElementById('recentBreaksList');
    if (!container) return;
    
    if (dailyBreaks.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); font-style: italic;">No breaks recorded in the selected period.</p>';
        return;
    }
    
    // Sort by start time (most recent first)
    const sortedBreaks = dailyBreaks.sort((a, b) => new Date(b.start) - new Date(a.start));
    
    // Show only last 10 breaks
    const recentBreaks = sortedBreaks.slice(0, 10);
    
    const breaksList = document.createElement('div');
    recentBreaks.forEach(break_ => {
        const breakItem = document.createElement('div');
        breakItem.className = 'break-item';
        
        const startTime = new Date(break_.start).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        const endTime = new Date(break_.end).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
        
        breakItem.innerHTML = `
            <div class="break-time">${startTime} - ${endTime}</div>
            <div class="break-duration">${break_.duration} min</div>
        `;
        
        breaksList.appendChild(breakItem);
    });
    
    container.innerHTML = '';
    container.appendChild(breaksList);
}

// Modal functionality
function showEventDetails(eventIndex) {
    currentEventIndex = eventIndex;
    const event = filteredEvents[eventIndex];
    if (!event) return;

    const modal = document.getElementById('detailModal');
    const modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = `
        <div class="detail-section">
            <h4>Basic Information</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Timestamp</div>
                    <div class="detail-value">${new Date(event.timestamp).toLocaleString()}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">User</div>
                    <div class="detail-value">${event.username || 'Unknown'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Duration</div>
                    <div class="detail-value">${formatDuration(Math.round((event.durationMs || 0) / 1000))}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Activity Type</div>
                    <div class="detail-value">${event.type || 'Unknown'}</div>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h4>Application & Domain</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Application</div>
                    <div class="detail-value">${event.data?.application || 'Unknown'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Domain</div>
                    <div class="detail-value">${event.domain || 'Unknown'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">URL</div>
                    <div class="detail-value">${event.data?.url || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Window Title</div>
                    <div class="detail-value">${event.data?.windowTitle || 'N/A'}</div>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h4>Activity Details</h4>
            <div class="detail-grid">
                <div class="detail-item">
                    <div class="detail-label">Reason</div>
                    <div class="detail-value">${event.reason || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Source</div>
                    <div class="detail-value">${event.source || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">Device ID</div>
                    <div class="detail-value">${event.deviceIdHash || 'N/A'}</div>
                </div>
                <div class="detail-item">
                    <div class="detail-label">IP Address</div>
                    <div class="detail-value">${event.ipAddress || 'N/A'}</div>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h4>Raw Data</h4>
            <div class="json-viewer">${JSON.stringify(event, null, 2)}</div>
        </div>
    `;

    modal.style.display = 'flex';
}

function hideEventDetails() {
    const modal = document.getElementById('detailModal');
    modal.style.display = 'none';
}

function exportCurrentEntry() {
    const event = filteredEvents[currentEventIndex];
    if (!event) return;

    const dataStr = JSON.stringify(event, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity-${event.username}-${new Date(event.timestamp).toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
}

function exportAllData() {
    const dataStr = JSON.stringify(filteredEvents, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity-export-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    URL.revokeObjectURL(url);
}

function exportCSV() {
    const headers = ['Timestamp', 'User', 'Application', 'Domain', 'Activity Type', 'Duration (s)', 'Reason', 'Source'];
    const csvContent = [
        headers.join(','),
        ...filteredEvents.map(event => [
            new Date(event.timestamp).toISOString(),
            event.username || 'Unknown',
            event.data?.application || 'Unknown',
            event.domain || 'Unknown',
            event.type || 'Unknown',
            Math.round((event.durationMs || 0) / 1000),
            event.reason || 'N/A',
            event.source || 'N/A'
        ].map(field => `"${field}"`).join(','))
    ].join('\n');

    const dataBlob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `activity-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    URL.revokeObjectURL(url);
}

function updateStatusIndicators(events) {
    const totalUsers = document.getElementById('totalUsers');
    const totalEvents = document.getElementById('totalEvents');
    const totalDomains = document.getElementById('totalDomains');
    
    if (totalUsers) {
        const uniqueUsers = new Set(events.map(e => e.username)).size;
        totalUsers.textContent = uniqueUsers;
    }
    
    if (totalEvents) {
        totalEvents.textContent = events.length;
    }
    
    if (totalDomains) {
        const uniqueDomains = new Set(events.map(e => e.domain)).size;
        totalDomains.textContent = uniqueDomains;
    }
}

// Add modal event listeners after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    // Modal event listeners
    const closeModal = document.getElementById('closeModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const exportEntry = document.getElementById('exportEntry');
    const detailModal = document.getElementById('detailModal');
    
    if (closeModal) {
        closeModal.addEventListener('click', hideEventDetails);
    }
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', hideEventDetails);
    }
    if (exportEntry) {
        exportEntry.addEventListener('click', exportCurrentEntry);
    }
    if (detailModal) {
        // Close modal when clicking outside
        detailModal.addEventListener('click', function(e) {
            if (e.target === this) {
                hideEventDetails();
            }
        });
    }
});
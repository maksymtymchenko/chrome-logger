// content.js - Event-driven screenshot capture and safe data tracking
// This script runs on all web pages to capture user interactions and track safe metadata

(function() {
    'use strict';

    // Debouncing for user events to prevent too many screenshots
    let lastEventTime = 0;
    const EVENT_DEBOUNCE_MS = 1000; // Minimum 1 second between event-triggered screenshots

    // Safe data tracking
    let interactionData = {
        formInteractions: [],
        contentStructure: {},
        apiCalls: [],
        userBehavior: {}
    };

    // Function to trigger screenshot with debouncing
    function triggerScreenshot(reason) {
        const now = Date.now();
        if (now - lastEventTime < EVENT_DEBOUNCE_MS) {
            return; // Skip if too soon since last event
        }
        lastEventTime = now;

        // Send message to background script
        chrome.runtime.sendMessage({
            action: 'takeScreenshot',
            reason: reason
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.log('Screenshot trigger failed:', chrome.runtime.lastError.message);
            }
        });
    }

    // Safe data tracking functions
    function trackFormInteraction(element, action) {
        const data = {
            timestamp: Date.now(),
            action: action, // 'focus', 'input', 'blur', 'submit'
            fieldType: element.type || 'text',
            fieldName: element.name || element.id || 'unnamed',
            fieldPlaceholder: element.placeholder || '',
            isRequired: element.required || false,
            maxLength: element.maxLength || null,
            formId: element.form ? element.form.id || 'unnamed' : null,
            pageUrl: window.location.href,
            domain: window.location.hostname
        };

        interactionData.formInteractions.push(data);

        // Send to background script for server sync
        chrome.runtime.sendMessage({
            action: 'trackData',
            dataType: 'formInteraction',
            data: data
        });
    }

    function trackContentStructure() {
        const structure = {
            timestamp: Date.now(),
            pageUrl: window.location.href,
            domain: window.location.hostname,
            title: document.title,
            headings: {
                h1: document.querySelectorAll('h1').length,
                h2: document.querySelectorAll('h2').length,
                h3: document.querySelectorAll('h3').length,
                h4: document.querySelectorAll('h4').length,
                h5: document.querySelectorAll('h5').length,
                h6: document.querySelectorAll('h6').length
            },
            forms: document.querySelectorAll('form').length,
            inputs: document.querySelectorAll('input').length,
            textareas: document.querySelectorAll('textarea').length,
            buttons: document.querySelectorAll('button').length,
            links: document.querySelectorAll('a').length,
            images: document.querySelectorAll('img').length,
            videos: document.querySelectorAll('video').length,
            iframes: document.querySelectorAll('iframe').length,
            scripts: document.querySelectorAll('script').length,
            stylesheets: document.querySelectorAll('link[rel="stylesheet"]').length
        };

        interactionData.contentStructure = structure;

        // Send to background script for server sync
        chrome.runtime.sendMessage({
            action: 'trackData',
            dataType: 'contentStructure',
            data: structure
        });
    }

    function trackUserBehavior(action, details = {}) {
        const behavior = {
            timestamp: Date.now(),
            action: action,
            pageUrl: window.location.href,
            domain: window.location.hostname,
            details: details
        };

        if (!interactionData.userBehavior[action]) {
            interactionData.userBehavior[action] = [];
        }
        interactionData.userBehavior[action].push(behavior);

        // Send to background script for server sync
        chrome.runtime.sendMessage({
            action: 'trackData',
            dataType: 'userBehavior',
            data: behavior
        });
    }

    // Event listeners for user interactions
    function setupEventListeners() {
        // Click events (mouse clicks, touch events)
        document.addEventListener('click', (e) => {
            // Skip clicks on common UI elements that don't represent meaningful user activity
            const target = e.target;
            const tagName = target.tagName.toLowerCase();
            const className = target.className.toLowerCase();

            // Skip clicks on scrollbars, navigation elements, etc.
            if (tagName === 'html' || tagName === 'body' ||
                className.includes('scrollbar') ||
                className.includes('navigation') ||
                target.closest('nav') ||
                target.closest('[role="navigation"]')) {
                return;
            }

            // Trigger screenshot for meaningful clicks
            triggerScreenshot('click');

            // Track different types of clicks for analytics
            if (tagName === 'a') {
                trackUserBehavior('link_click', {
                    href: target.href || '',
                    text: target.textContent.trim().substring(0, 100) || '',
                    isExternal: target.hostname !== window.location.hostname
                });
            } else if (tagName === 'button') {
                trackUserBehavior('button_click', {
                    buttonText: target.textContent.trim().substring(0, 50) || '',
                    buttonType: target.type || 'button',
                    isDisabled: target.disabled || false
                });
            }
        }, { passive: true });

        // Keyboard events (typing, shortcuts)
        document.addEventListener('keydown', (e) => {
            // Skip modifier keys and function keys
            if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' ||
                e.key === 'Meta' || e.key === 'Tab' || e.key === 'Escape' ||
                e.key.startsWith('F') && e.key.length <= 3) {
                return;
            }

            triggerScreenshot('keyboard');
        }, { passive: true });


        // Form interactions
        document.addEventListener('input', (e) => {
            const target = e.target;
            const tagName = target.tagName.toLowerCase();

            // Only capture meaningful form inputs
            if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
                triggerScreenshot('form-input');
                trackFormInteraction(target, 'input');
            }
        }, { passive: true });

        // Form focus events
        document.addEventListener('focusin', (e) => {
            const target = e.target;
            const tagName = target.tagName.toLowerCase();

            // Track focus on form elements
            if (['input', 'textarea', 'select', 'button'].includes(tagName)) {
                trackFormInteraction(target, 'focus');
            }
        }, { passive: true });

        // Form blur events
        document.addEventListener('focusout', (e) => {
            const target = e.target;
            const tagName = target.tagName.toLowerCase();

            // Track blur on form elements
            if (['input', 'textarea', 'select'].includes(tagName)) {
                trackFormInteraction(target, 'blur');
            }
        }, { passive: true });

        // Form submit events
        document.addEventListener('submit', (e) => {
            const form = e.target;
            if (form.tagName.toLowerCase() === 'form') {
                trackFormInteraction(form, 'submit');
                trackUserBehavior('form_submit', {
                    formId: form.id || 'unnamed',
                    formAction: form.action || '',
                    formMethod: form.method || 'get'
                });
            }
        }, { passive: true });


        // Mouse movement (only after significant movement)
        let mouseMoveTimeout;
        let lastMouseX = 0;
        let lastMouseY = 0;
        document.addEventListener('mousemove', (e) => {
            const deltaX = Math.abs(e.clientX - lastMouseX);
            const deltaY = Math.abs(e.clientY - lastMouseY);

            // Only trigger if mouse moved significantly (more than 50 pixels)
            if (deltaX > 50 || deltaY > 50) {
                lastMouseX = e.clientX;
                lastMouseY = e.clientY;

                clearTimeout(mouseMoveTimeout);
                mouseMoveTimeout = setTimeout(() => {
                    triggerScreenshot('mouse-move');
                }, 1000); // Wait 1 second after significant mouse movement
            }
        }, { passive: true });

        // Touch events (for mobile devices)
        document.addEventListener('touchstart', (e) => {
            triggerScreenshot('touch');
        }, { passive: true });

        // Context menu (right-click)
        document.addEventListener('contextmenu', (e) => {
            triggerScreenshot('context-menu');
        }, { passive: true });

        // Drag events
        document.addEventListener('dragstart', (e) => {
            triggerScreenshot('drag');
        }, { passive: true });

        // Drop events
        document.addEventListener('drop', (e) => {
            triggerScreenshot('drop');
        }, { passive: true });
    }

    // Initialize event listeners when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setupEventListeners();
            trackContentStructure();
        });
    } else {
        setupEventListeners();
        trackContentStructure();
    }

    // Track page visibility changes
    document.addEventListener('visibilitychange', () => {
        trackUserBehavior('visibility_change', {
            hidden: document.hidden,
            visibilityState: document.visibilityState
        });
    });

    // Track page unload
    window.addEventListener('beforeunload', () => {
        trackUserBehavior('page_unload', {
            timeOnPage: Date.now() - (interactionData.pageLoadTime || Date.now())
        });
    });

    // Store page load time
    interactionData.pageLoadTime = Date.now();

    console.log('Event-driven screenshot capture and safe data tracking initialized');
})();
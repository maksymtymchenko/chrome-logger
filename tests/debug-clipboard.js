#!/usr/bin/env node

/**
 * Debug script to test clipboard tracking functionality
 * This will help identify why clipboard data isn't appearing in logs
 */

const { ActivityTracker } = require('./src/activityTracker');
const { ConfigManager } = require('./src/configManager');

async function debugClipboard() {
    console.log('🔍 Debugging Clipboard Tracking');
    console.log('================================');

    // Initialize config and tracker
    const configManager = new ConfigManager();
    const tracker = new ActivityTracker(configManager);

    // Check configuration
    console.log('\n1. Configuration Check:');
    const config = configManager.getConfig();
    console.log('   trackClipboard:', config.trackClipboard);
    console.log('   username:', config.username);
    console.log('   serverUrl:', config.serverUrl);

    if (!config.trackClipboard) {
        console.log('❌ Clipboard tracking is disabled in config!');
        console.log('   Enable it by setting trackClipboard: true');
        return;
    }

    // Test clipboard access directly
    console.log('\n2. Direct Clipboard Access Test:');
    try {
        const clipboardy = require('clipboardy');
        const content = await clipboardy.read();
        console.log('✅ Clipboard access works');
        console.log('   Current content length:', content ? content.length : 0);
        console.log('   Content preview:', content ? content.substring(0, 50) + '...' : 'Empty');
    } catch (error) {
        console.log('❌ Clipboard access failed:', error.message);
        return;
    }

    // Start tracking
    console.log('\n3. Starting Activity Tracking:');
    await tracker.start();
    console.log('✅ Activity tracking started');

    // Monitor for clipboard events
    console.log('\n4. Monitoring for Clipboard Events:');
    console.log('   - Copy some text to clipboard (Cmd+C)');
    console.log('   - The app will check every 2 seconds');
    console.log('   - Press Ctrl+C to stop monitoring');

    let eventCount = 0;
    const originalSendActivityData = tracker.sendActivityData.bind(tracker);
    tracker.sendActivityData = async function() {
        const result = await originalSendActivityData();
        eventCount++;
        console.log(`📤 Sent activity data (${eventCount} times)`);
        return result;
    };

    // Monitor for 30 seconds
    const monitorInterval = setInterval(() => {
        console.log(`   Monitoring... (${new Date().toLocaleTimeString()})`);
    }, 5000);

    // Stop after 30 seconds
    setTimeout(async() => {
        clearInterval(monitorInterval);
        console.log('\n5. Test Results:');
        console.log(`   Events sent to server: ${eventCount}`);

        if (eventCount > 0) {
            console.log('✅ Clipboard tracking is working!');
            console.log('   Check the server logs and activity_log.json for clipboard events');
        } else {
            console.log('❌ No clipboard events detected');
            console.log('   Possible issues:');
            console.log('   - No clipboard changes during test period');
            console.log('   - Clipboard access permissions');
            console.log('   - Server connection issues');
        }

        await tracker.stop();
        console.log('\nDebug completed');
        process.exit(0);
    }, 30000);

    // Handle Ctrl+C
    process.on('SIGINT', async() => {
        clearInterval(monitorInterval);
        console.log('\n\nStopping debug...');
        await tracker.stop();
        process.exit(0);
    });
}

// Run the debug
debugClipboard().catch(error => {
    console.error('Debug failed:', error);
    process.exit(1);
});
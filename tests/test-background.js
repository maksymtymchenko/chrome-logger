#!/usr/bin/env node

/**
 * Test script to verify background mode functionality
 * This script will help test if the app continues running in background
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('Testing Windows Activity Tracker Background Mode...');
console.log('================================================');

// Start the app
console.log('1. Starting the app...');
const app = spawn('electron', ['.'], {
    cwd: path.join(__dirname, '..', 'windows-app'),
    stdio: 'pipe'
});

let appStarted = false;

app.stdout.on('data', (data) => {
    const output = data.toString();
    console.log('App output:', output);

    if (output.includes('All windows closed, but keeping app running in background')) {
        console.log('✅ Background mode activated successfully!');
        appStarted = true;
    }

    if (output.includes('Window hidden to tray, app continues running in background')) {
        console.log('✅ Window successfully hidden to tray!');
    }
});

app.stderr.on('data', (data) => {
    console.log('App error:', data.toString());
});

app.on('close', (code) => {
    console.log(`App exited with code ${code}`);
    if (code === 0) {
        console.log('✅ App closed cleanly');
    } else {
        console.log('❌ App exited with error');
    }
});

// Test instructions
setTimeout(() => {
    console.log('\n2. Test Instructions:');
    console.log('   - The app should start and show a window');
    console.log('   - Close the window (X button) - it should hide to tray');
    console.log('   - Check system tray for the app icon');
    console.log('   - Right-click tray icon to access menu');
    console.log('   - Double-click tray icon to show window again');
    console.log('   - Use "Quit" from tray menu to properly close the app');
    console.log('\n3. Background Activity:');
    console.log('   - Activity tracking should continue even when window is closed');
    console.log('   - Check the activity_log.json file for ongoing activity');
    console.log('   - Screenshots should continue being taken in background');
}, 2000);

// Auto-close after 30 seconds for testing
setTimeout(() => {
    if (appStarted) {
        console.log('\n✅ Background mode test completed successfully!');
        console.log('The app is running in background mode.');
        console.log('You can now close this test script and the app will continue running.');
        console.log('Use the tray icon to interact with the app.');
    } else {
        console.log('\n❌ Background mode test failed - app may not have started properly');
        app.kill();
    }
}, 30000);

// Handle Ctrl+C
process.on('SIGINT', () => {
    console.log('\n\nStopping test...');
    app.kill();
    process.exit(0);
});
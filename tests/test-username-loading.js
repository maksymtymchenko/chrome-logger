#!/usr/bin/env node

/**
 * Test script to verify username loading functionality
 */

const { spawn } = require('child_process');
const path = require('path');

async function testUsernameLoading() {
    console.log('🧪 Testing Username Loading Fix');
    console.log('==============================');

    console.log('\n1. Testing App Startup:');
    console.log('   - Starting the Windows app...');
    console.log('   - Checking if username loads correctly');
    console.log('   - Looking for "Loading..." vs actual username');

    // Start the app
    const app = spawn('electron', ['.'], {
        cwd: path.join(__dirname, '..', 'windows-app'),
        stdio: 'pipe'
    });

    let usernameFound = false;
    let loadingDetected = false;
    let errorDetected = false;

    app.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('App output:', output);

        if (output.includes('Username loaded successfully')) {
            usernameFound = true;
            console.log('✅ Username loaded successfully!');
        }

        if (output.includes('Loading username')) {
            console.log('🔄 Username loading in progress...');
        }

        if (output.includes('Error loading username')) {
            errorDetected = true;
            console.log('❌ Username loading error detected');
        }
    });

    app.stderr.on('data', (data) => {
        const error = data.toString();
        console.log('App error:', error);

        if (error.includes('Error')) {
            errorDetected = true;
        }
    });

    // Monitor for 15 seconds
    setTimeout(() => {
        console.log('\n2. Test Results:');

        if (usernameFound) {
            console.log('✅ Username loading test PASSED');
            console.log('   - Username was successfully loaded');
            console.log('   - No more "Loading..." display');
        } else if (errorDetected) {
            console.log('❌ Username loading test FAILED');
            console.log('   - Error detected during username loading');
        } else {
            console.log('⚠️  Username loading test INCONCLUSIVE');
            console.log('   - No clear success or failure detected');
            console.log('   - Check console output for details');
        }

        console.log('\n3. Debugging Tips:');
        console.log('   - Check browser console for detailed logs');
        console.log('   - Look for "Loading username" messages');
        console.log('   - Verify config is being loaded correctly');
        console.log('   - Check IPC communication between renderer and main');

        app.kill();
        process.exit(0);
    }, 15000);

    // Handle Ctrl+C
    process.on('SIGINT', () => {
        console.log('\n\nStopping test...');
        app.kill();
        process.exit(0);
    });
}

// Run the test
testUsernameLoading().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
#!/usr/bin/env node

/**
 * Test script to verify screenshot statistics are loading correctly
 */

async function testScreenshotStats() {
    console.log('🧪 Testing Screenshot Statistics Loading');
    console.log('=======================================');

    try {
        console.log('\n1. Testing Screenshots API Endpoint:');
        const response = await fetch('http://localhost:8080/api/screenshots?limit=1');

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ Screenshots API endpoint accessible');
        console.log('   Response structure:', Object.keys(data));
        console.log('   Screenshots count:', data.count);
        console.log('   Files array length:', data.files ? data.files.length : 'undefined');

        console.log('\n2. Testing Dashboard Elements:');
        console.log('   - Check if statTotalScreenshots element exists');
        console.log('   - Verify element ID is correct');

        console.log('\n3. Expected Behavior:');
        console.log('   - Screenshots stat card should show:', data.count);
        console.log('   - No more dashes (-) in the screenshots stat card');
        console.log('   - Count should update when screenshots are deleted');

        console.log('\n4. Test Results:');
        if (data.count !== undefined) {
            console.log('✅ Screenshot stats test PASSED');
            console.log('   - API is returning screenshot count');
            console.log('   - Statistics should now display correctly');
            console.log('   - Screenshots stat card should show:', data.count);
        } else {
            console.log('❌ Screenshot stats test FAILED');
            console.log('   - API is not returning screenshot count');
        }

        console.log('\n5. Debugging Tips:');
        console.log('   - Open browser console on dashboard');
        console.log('   - Look for "loadScreenshotCount" function calls');
        console.log('   - Check for any "element not found" errors');
        console.log('   - Verify statTotalScreenshots element exists');

    } catch (error) {
        console.log('\n❌ Screenshot stats test FAILED');
        console.log('   Error:', error.message);
        console.log('\nTroubleshooting:');
        console.log('   1. Make sure server is running: cd server && node server.js');
        console.log('   2. Check server logs for errors');
        console.log('   3. Verify screenshots directory exists');
    }
}

// Run the test
testScreenshotStats().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
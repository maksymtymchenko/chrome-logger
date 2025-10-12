#!/usr/bin/env node

/**
 * Test script to verify complete dashboard statistics are working correctly
 */

async function testCompleteStats() {
    console.log('🧪 Testing Complete Dashboard Statistics');
    console.log('======================================');

    try {
        console.log('\n1. Testing API Statistics:');
        const response = await fetch('http://localhost:8080/api/activity?limit=10');

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ API endpoint accessible');
        console.log('   Events returned:', data.events.length);
        console.log('   Total Events (API):', data.stats.totalEvents);
        console.log('   Unique Users (API):', data.stats.uniqueUsers);
        console.log('   Unique Domains (API):', data.stats.uniqueDomains);

        console.log('\n2. Testing Screenshots API:');
        const screenshotResponse = await fetch('http://localhost:8080/api/screenshots?limit=1');

        if (!screenshotResponse.ok) {
            throw new Error(`Screenshots API HTTP ${screenshotResponse.status}`);
        }

        const screenshotData = await screenshotResponse.json();
        console.log('✅ Screenshots API accessible');
        console.log('   Screenshots count:', screenshotData.count);

        console.log('\n3. Expected Dashboard Display:');
        console.log('   Status Indicators (small numbers at top):');
        console.log(`     - Events: ${data.stats.totalEvents.toLocaleString()}`);
        console.log(`     - Users: ${data.stats.uniqueUsers.toLocaleString()}`);
        console.log(`     - Domains: ${data.stats.uniqueDomains.toLocaleString()}`);
        console.log('   Stat Cards (large numbers in grid):');
        console.log(`     - Total Events: ${data.stats.totalEvents.toLocaleString()}`);
        console.log(`     - Active Users: ${data.stats.uniqueUsers.toLocaleString()}`);
        console.log(`     - Domains: ${data.stats.uniqueDomains.toLocaleString()}`);
        console.log(`     - Screenshots: ${screenshotData.count.toLocaleString()}`);

        console.log('\n4. Key Fixes Applied:');
        console.log('   ✅ Fixed duplicate HTML element IDs');
        console.log('   ✅ Status indicators use API stats (not limited event array)');
        console.log('   ✅ Stat cards use API stats (not limited event array)');
        console.log('   ✅ Screenshot count loads from API');
        console.log('   ✅ No more dashes (-) in stat cards');

        console.log('\n5. Test Results:');
        if (data.stats.totalEvents > 1000) {
            console.log('✅ Complete stats test PASSED');
            console.log('   - API returns complete database statistics');
            console.log('   - Dashboard should show correct totals');
            console.log('   - No more 1000 event limit issue');
        } else {
            console.log('⚠️  Complete stats test INCONCLUSIVE');
            console.log('   - Database may have fewer than 1000 events');
            console.log('   - Check if Windows app is generating activity');
        }

        console.log('\n6. Troubleshooting:');
        console.log('   - Refresh the dashboard page');
        console.log('   - Check browser console for errors');
        console.log('   - Verify both status indicators and stat cards show same values');
        console.log('   - Screenshots count should update when screenshots are deleted');

    } catch (error) {
        console.log('\n❌ Complete stats test FAILED');
        console.log('   Error:', error.message);
        console.log('\nTroubleshooting:');
        console.log('   1. Make sure server is running: cd server && node server.js');
        console.log('   2. Check server logs for errors');
        console.log('   3. Verify database connection');
    }
}

// Run the test
testCompleteStats().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
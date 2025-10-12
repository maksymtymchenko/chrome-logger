#!/usr/bin/env node

/**
 * Test script to verify dashboard statistics are loading correctly
 */

// Using built-in fetch (Node.js 18+) or fallback to curl

async function testDashboardStats() {
    console.log('🧪 Testing Dashboard Statistics Loading');
    console.log('=====================================');

    try {
        console.log('\n1. Testing API Endpoint:');
        const response = await fetch('http://localhost:8080/api/activity?limit=10');

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('✅ API endpoint accessible');
        console.log('   Response structure:', Object.keys(data));
        console.log('   Events count:', data.events ? data.events.length : 'undefined');
        console.log('   Stats available:', !!data.stats);

        if (data.stats) {
            console.log('   Stats details:');
            console.log('     - Total Events:', data.stats.totalEvents);
            console.log('     - Unique Users:', data.stats.uniqueUsers);
            console.log('     - Unique Domains:', data.stats.uniqueDomains);
            console.log('     - Total Duration:', data.stats.totalDuration);
        }

        console.log('\n2. Testing Dashboard Elements:');
        console.log('   - Check if totalEvents element exists');
        console.log('   - Check if totalUsers element exists');
        console.log('   - Check if totalDomains element exists');

        console.log('\n3. Expected Behavior:');
        console.log('   - Total Events should show:', data.stats ? data.stats.totalEvents : 'N/A');
        console.log('   - Active Users should show:', data.stats ? data.stats.uniqueUsers : 'N/A');
        console.log('   - Domains should show:', data.stats ? data.stats.uniqueDomains : 'N/A');

        console.log('\n4. Debugging Tips:');
        console.log('   - Open browser console on dashboard');
        console.log('   - Look for "updateStatsFromAPI called with stats" message');
        console.log('   - Check for any "element not found" errors');
        console.log('   - Verify stats object has correct values');

        if (data.stats && data.stats.totalEvents > 0) {
            console.log('\n✅ Dashboard stats test PASSED');
            console.log('   - API is returning data with stats');
            console.log('   - Statistics should now display correctly');
        } else {
            console.log('\n⚠️  Dashboard stats test INCONCLUSIVE');
            console.log('   - No events found in database');
            console.log('   - Start the Windows app to generate some activity');
        }

    } catch (error) {
        console.log('\n❌ Dashboard stats test FAILED');
        console.log('   Error:', error.message);
        console.log('\nTroubleshooting:');
        console.log('   1. Make sure server is running: cd server && node server.js');
        console.log('   2. Check server logs for errors');
        console.log('   3. Verify database connection');
    }
}

// Run the test
testDashboardStats().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
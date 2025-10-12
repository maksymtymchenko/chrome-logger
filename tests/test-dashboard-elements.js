#!/usr/bin/env node

/**
 * Test script to verify dashboard HTML elements exist with correct IDs
 */

const fs = require('fs');
const path = require('path');

function testDashboardElements() {
    console.log('🧪 Testing Dashboard HTML Elements');
    console.log('=================================');

    try {
        const htmlPath = path.join(__dirname, '..', 'server', 'dashboard', 'index.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');

        console.log('\n1. Checking for duplicate IDs:');

        // Check for duplicate IDs
        const idMatches = htmlContent.match(/id="([^"]+)"/g) || [];
        const ids = idMatches.map(match => match.replace('id="', '').replace('"', ''));
        const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);

        if (duplicateIds.length > 0) {
            console.log('❌ Found duplicate IDs:', [...new Set(duplicateIds)]);
        } else {
            console.log('✅ No duplicate IDs found');
        }

        console.log('\n2. Checking required stat card elements:');

        const requiredElements = [
            'statTotalEvents',
            'statTotalUsers',
            'statTotalDomains',
            'statTotalScreenshots'
        ];

        const missingElements = [];
        requiredElements.forEach(id => {
            if (htmlContent.includes(`id="${id}"`)) {
                console.log(`✅ Found: ${id}`);
            } else {
                console.log(`❌ Missing: ${id}`);
                missingElements.push(id);
            }
        });

        console.log('\n3. Checking status indicator elements:');

        const statusElements = [
            'totalEvents',
            'totalUsers',
            'totalDomains'
        ];

        statusElements.forEach(id => {
            if (htmlContent.includes(`id="${id}"`)) {
                console.log(`✅ Found: ${id}`);
            } else {
                console.log(`❌ Missing: ${id}`);
            }
        });

        console.log('\n4. Test Results:');

        if (duplicateIds.length === 0 && missingElements.length === 0) {
            console.log('✅ Dashboard elements test PASSED');
            console.log('   - All required elements exist');
            console.log('   - No duplicate IDs found');
            console.log('   - Statistics should display correctly');
        } else {
            console.log('❌ Dashboard elements test FAILED');
            if (duplicateIds.length > 0) {
                console.log('   - Fix duplicate IDs:', [...new Set(duplicateIds)]);
            }
            if (missingElements.length > 0) {
                console.log('   - Add missing elements:', missingElements);
            }
        }

        console.log('\n5. Expected Dashboard Display:');
        console.log('   - Stat Cards (large numbers): Should show actual counts');
        console.log('   - Status Indicators (small numbers): Should show actual counts');
        console.log('   - No more dashes (-) in the stat cards');

    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
}

// Run the test
testDashboardElements();
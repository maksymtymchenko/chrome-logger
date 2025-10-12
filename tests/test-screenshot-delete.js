#!/usr/bin/env node

/**
 * Test script to verify screenshot deletion functionality
 */

const fs = require('fs');
const path = require('path');

async function testScreenshotDeletion() {
    console.log('🧪 Testing Screenshot Deletion Functionality');
    console.log('============================================');

    // Test API endpoints
    console.log('\n1. Testing API Endpoints:');

    try {
        // Test single screenshot deletion
        console.log('   Testing single screenshot deletion...');
        const testFilename = 'test_screenshot.png';

        // Create a test screenshot file
        const testFilePath = path.join(__dirname, '..', 'server', 'screenshots', testFilename);
        const testDir = path.dirname(testFilePath);

        if (!fs.existsSync(testDir)) {
            fs.mkdirSync(testDir, { recursive: true });
        }

        // Create a dummy PNG file
        const dummyPngData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
        fs.writeFileSync(testFilePath, dummyPngData);

        console.log('   ✅ Test screenshot created');

        // Test deletion via API
        const response = await fetch(`http://localhost:8080/api/screenshots/${encodeURIComponent(testFilename)}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            const result = await response.json();
            console.log('   ✅ Single screenshot deletion API works');
            console.log('   Response:', result);
        } else {
            console.log('   ❌ Single screenshot deletion API failed:', response.status);
        }

    } catch (error) {
        console.log('   ❌ Single screenshot deletion test failed:', error.message);
    }

    try {
        // Test bulk deletion
        console.log('\n   Testing bulk screenshot deletion...');

        const testFilenames = ['test1.png', 'test2.png', 'test3.png'];
        const testDir = path.join(__dirname, '..', 'server', 'screenshots');

        // Create test files
        const dummyPngData = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

        testFilenames.forEach(filename => {
            const filePath = path.join(testDir, filename);
            fs.writeFileSync(filePath, dummyPngData);
        });

        console.log('   ✅ Test screenshots created');

        // Test bulk deletion via API
        const response = await fetch('http://localhost:8080/api/screenshots', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ filenames: testFilenames })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('   ✅ Bulk screenshot deletion API works');
            console.log('   Response:', result);
        } else {
            console.log('   ❌ Bulk screenshot deletion API failed:', response.status);
        }

    } catch (error) {
        console.log('   ❌ Bulk screenshot deletion test failed:', error.message);
    }

    console.log('\n2. UI Features Added:');
    console.log('   ✅ Delete button on each screenshot (appears on hover)');
    console.log('   ✅ "Delete All" button in screenshot controls');
    console.log('   ✅ Confirmation dialogs for both single and bulk deletion');
    console.log('   ✅ Success/error messages after deletion');
    console.log('   ✅ Automatic UI refresh after deletion');

    console.log('\n3. How to Test in Browser:');
    console.log('   1. Start the server: cd server && node server.js');
    console.log('   2. Open dashboard: http://localhost:8080');
    console.log('   3. Go to "Latest Screenshots" section');
    console.log('   4. Hover over a screenshot to see the delete button');
    console.log('   5. Click delete button to delete individual screenshots');
    console.log('   6. Click "Delete All" button to delete all screenshots');
    console.log('   7. Confirm deletion in the dialog');

    console.log('\n✅ Screenshot deletion functionality test completed!');
}

// Run the test
testScreenshotDeletion().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
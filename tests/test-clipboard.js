#!/usr/bin/env node

/**
 * Test script to verify clipboard access functionality
 */

const clipboardy = require('clipboardy');

async function testClipboard() {
    console.log('Testing clipboard access...');

    try {
        // Test reading clipboard
        console.log('1. Testing clipboard read...');
        const content = await clipboardy.read();
        console.log('✅ Clipboard read successful');
        console.log('Content length:', content ? content.length : 0);
        console.log('Content preview:', content ? content.substring(0, 100) : 'Empty');

        // Test writing to clipboard
        console.log('\n2. Testing clipboard write...');
        const testText = `Test clipboard content - ${new Date().toISOString()}`;
        await clipboardy.write(testText);
        console.log('✅ Clipboard write successful');

        // Test reading back
        console.log('\n3. Testing clipboard read after write...');
        const readBack = await clipboardy.read();
        console.log('✅ Clipboard read back successful');
        console.log('Read back content:', readBack);

        if (readBack === testText) {
            console.log('✅ Clipboard test PASSED - read/write cycle works correctly');
        } else {
            console.log('❌ Clipboard test FAILED - content mismatch');
        }

    } catch (error) {
        console.error('❌ Clipboard test FAILED:', error.message);
        console.error('Full error:', error);

        // Check if it's a permission issue
        if (error.message.includes('permission') || error.message.includes('access')) {
            console.log('\n💡 This might be a permission issue. Try:');
            console.log('   - Running the app with administrator privileges');
            console.log('   - Checking macOS accessibility permissions');
            console.log('   - Ensuring the app has clipboard access permissions');
        }
    }
}

// Run the test
testClipboard().then(() => {
    console.log('\nClipboard test completed');
    process.exit(0);
}).catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
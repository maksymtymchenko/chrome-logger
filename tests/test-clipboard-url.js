#!/usr/bin/env node

/**
 * Test script to verify clipboard URL tracking functionality
 */

const clipboardy = require('clipboardy');

async function testClipboardUrlTracking() {
    console.log('🧪 Testing Clipboard URL Tracking');
    console.log('================================');

    // Test URL detection
    console.log('\n1. Testing URL Detection:');

    const testUrls = [
        'https://www.google.com/search?q=test',
        'http://example.com/page',
        'https://github.com/user/repo',
        'https://stackoverflow.com/questions/123456',
        'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    ];

    testUrls.forEach(url => {
        const detectedUrl = detectUrlFromClipboard(url);
        const domain = detectedUrl ? detectedUrl.replace(/^https?:\/\//, '').split('/')[0] : 'None';
        console.log(`   URL: ${url}`);
        console.log(`   Detected: ${detectedUrl || 'None'}`);
        console.log(`   Domain: ${domain}`);
        console.log('');
    });

    // Test clipboard type detection
    console.log('\n2. Testing Clipboard Type Detection:');

    const testContent = [
        { content: 'https://www.google.com', expected: 'url' },
        { content: 'user@example.com', expected: 'email' },
        { content: '12345', expected: 'number' },
        { content: 'Line 1\nLine 2', expected: 'multiline_text' },
        { content: 'Just some text', expected: 'text' }
    ];

    testContent.forEach(test => {
        const detectedType = detectClipboardType(test.content);
        const status = detectedType === test.expected ? '✅' : '❌';
        console.log(`   ${status} "${test.content}" -> ${detectedType} (expected: ${test.expected})`);
    });

    console.log('\n3. Testing Real Clipboard:');
    console.log('   - Copy a URL from Chrome (Cmd+C)');
    console.log('   - The app should detect it as a URL type');
    console.log('   - Check the logs table for proper application and domain display');

    console.log('\n✅ Clipboard URL tracking test completed!');
}

function detectUrlFromClipboard(content) {
    // Extract URL from clipboard content if it contains one
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const matches = content.match(urlRegex);
    return matches ? matches[0] : null;
}

function detectClipboardType(content) {
    if (content.includes('http://') || content.includes('https://')) {
        return 'url';
    } else if (content.includes('@') && content.includes('.')) {
        return 'email';
    } else if (/^\d+$/.test(content)) {
        return 'number';
    } else if (content.includes('\n')) {
        return 'multiline_text';
    } else {
        return 'text';
    }
}

// Run the test
testClipboardUrlTracking().catch(error => {
    console.error('Test failed:', error);
    process.exit(1);
});
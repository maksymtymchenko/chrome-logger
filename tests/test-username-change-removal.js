#!/usr/bin/env node

/**
 * Test script to verify username change functionality has been removed
 */

const fs = require('fs');
const path = require('path');

function testUsernameChangeRemoval() {
    console.log('🧪 Testing Username Change Functionality Removal');
    console.log('===============================================');

    try {
        const htmlPath = path.join(__dirname, '..', 'windows-app', 'src', 'renderer', 'index.html');
        const jsPath = path.join(__dirname, '..', 'windows-app', 'src', 'renderer', 'renderer.js');

        console.log('\n1. Checking HTML for removed elements:');

        const htmlContent = fs.readFileSync(htmlPath, 'utf8');

        // Check for removed elements
        const removedElements = [
            'setupDialog',
            'usernameInput',
            'saveUsername',
            'changeUsername',
            'useLaptopName',
            'errorMessage'
        ];

        const foundElements = [];
        removedElements.forEach(element => {
            if (htmlContent.includes(element)) {
                foundElements.push(element);
            }
        });

        if (foundElements.length === 0) {
            console.log('✅ All username change elements removed from HTML');
        } else {
            console.log('❌ Found remaining elements:', foundElements);
        }

        console.log('\n2. Checking JavaScript for removed functions:');

        const jsContent = fs.readFileSync(jsPath, 'utf8');

        // Check for removed functions
        const removedFunctions = [
            'showSetupDialog',
            'showSetupDialogWithLaptopName',
            'saveUsername',
            'useLaptopName',
            'validateUsername',
            'showError',
            'hideError',
            'showSuccess'
        ];

        const foundFunctions = [];
        removedFunctions.forEach(func => {
            if (jsContent.includes(`function ${func}`) || jsContent.includes(`${func}(`)) {
                foundFunctions.push(func);
            }
        });

        if (foundFunctions.length === 0) {
            console.log('✅ All username change functions removed from JavaScript');
        } else {
            console.log('❌ Found remaining functions:', foundFunctions);
        }

        console.log('\n3. Checking for remaining username change references:');

        const remainingReferences = [
            'setupDialog',
            'usernameInput',
            'saveUsername',
            'changeUsername',
            'useLaptopName',
            'errorMessage'
        ];

        const foundReferences = [];
        remainingReferences.forEach(ref => {
            if (jsContent.includes(ref)) {
                foundReferences.push(ref);
            }
        });

        if (foundReferences.length === 0) {
            console.log('✅ No remaining username change references in JavaScript');
        } else {
            console.log('⚠️  Found remaining references:', foundReferences);
        }

        console.log('\n4. Expected App Behavior:');
        console.log('   - App shows main content immediately');
        console.log('   - No setup dialog or username input');
        console.log('   - No "Change Name" button');
        console.log('   - Username is displayed as read-only');
        console.log('   - App starts tracking immediately');

        console.log('\n5. Test Results:');

        if (foundElements.length === 0 && foundFunctions.length === 0 && foundReferences.length === 0) {
            console.log('✅ Username change removal test PASSED');
            console.log('   - All username change functionality removed');
            console.log('   - App should work without username change options');
        } else {
            console.log('❌ Username change removal test FAILED');
            console.log('   - Some username change elements/functions remain');
            console.log('   - App may still show username change options');
        }

    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
}

// Run the test
testUsernameChangeRemoval();
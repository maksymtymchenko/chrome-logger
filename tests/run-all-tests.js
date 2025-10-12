#!/usr/bin/env node

/**
 * Test runner script to execute all tests in the tests directory
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

async function runAllTests() {
    console.log('🧪 Running All Tests');
    console.log('===================');

    const testDir = __dirname;
    const testFiles = fs.readdirSync(testDir)
        .filter(file => file.endsWith('.js') && file !== 'run-all-tests.js' && file !== 'README.md')
        .sort();

    console.log(`Found ${testFiles.length} test files:`);
    testFiles.forEach(file => console.log(`  - ${file}`));
    console.log('');

    let passed = 0;
    let failed = 0;
    const results = [];

    for (const testFile of testFiles) {
        console.log(`\n🔍 Running ${testFile}...`);
        console.log('─'.repeat(50));

        try {
            const result = await runTest(testFile);
            if (result.success) {
                console.log(`✅ ${testFile} - PASSED`);
                passed++;
            } else {
                console.log(`❌ ${testFile} - FAILED`);
                failed++;
            }
            results.push({ file: testFile, ...result });
        } catch (error) {
            console.log(`❌ ${testFile} - ERROR: ${error.message}`);
            failed++;
            results.push({ file: testFile, success: false, error: error.message });
        }
    }

    console.log('\n📊 Test Results Summary');
    console.log('======================');
    console.log(`Total Tests: ${testFiles.length}`);
    console.log(`Passed: ${passed} ✅`);
    console.log(`Failed: ${failed} ❌`);
    console.log(`Success Rate: ${Math.round((passed / testFiles.length) * 100)}%`);

    if (failed > 0) {
        console.log('\n❌ Failed Tests:');
        results.filter(r => !r.success).forEach(result => {
            console.log(`  - ${result.file}: ${result.error || 'Unknown error'}`);
        });
    }

    console.log('\n🏁 Test run completed!');
    process.exit(failed > 0 ? 1 : 0);
}

function runTest(testFile) {
    return new Promise((resolve) => {
        const testPath = path.join(__dirname, testFile);
        const child = spawn('node', [testPath], {
            cwd: __dirname,
            stdio: 'pipe'
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => {
            stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        child.on('close', (code) => {
            resolve({
                success: code === 0,
                exitCode: code,
                stdout: stdout.trim(),
                stderr: stderr.trim()
            });
        });

        child.on('error', (error) => {
            resolve({
                success: false,
                error: error.message,
                stdout: stdout.trim(),
                stderr: stderr.trim()
            });
        });
    });
}

// Run all tests
runAllTests().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
});
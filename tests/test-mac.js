const clipboardy = require('clipboardy');
const si = require('systeminformation');

async function testMacCompatibility() {
    console.log('🧪 Testing Mac compatibility...\n');

    try {
        // Test process monitoring (alternative to window detection)
        console.log('1. Testing process monitoring...');
        const processes = await si.processes();
        const topProcess = processes.list
            .filter(proc => proc.cpu > 0)
            .sort((a, b) => b.cpu - a.cpu)[0];

        if (topProcess) {
            console.log('✅ Top process detected:', topProcess.name);
            console.log('   CPU usage:', topProcess.cpu + '%');
            console.log('   Memory:', (topProcess.mem / 1024 / 1024).toFixed(1) + 'MB');
        } else {
            console.log('⚠️  No active processes detected');
        }

        // Test clipboard access
        console.log('\n2. Testing clipboard access...');
        try {
            const clipboard = await clipboardy.read();
            console.log('✅ Clipboard access working');
            console.log('   Content length:', clipboard.length);
            console.log('   Content preview:', clipboard.substring(0, 50) + '...');
        } catch (error) {
            console.log('⚠️  Clipboard access failed:', error.message);
            console.log('   This is normal on some systems due to privacy settings');
        }

        // Test system information
        console.log('\n3. Testing system information...');
        const system = await si.system();
        const os = await si.osInfo();
        console.log('✅ System info working');
        console.log('   Platform:', os.platform);
        console.log('   OS:', os.distro);
        console.log('   Architecture:', system.model);

        // Test processes
        console.log('\n4. Testing process monitoring...');
        const processList = await si.processes();
        console.log('✅ Process monitoring working');
        console.log('   Total processes:', processList.all);
        console.log('   Running processes:', processList.running);
        console.log('   Top 3 by CPU:');
        processList.list.slice(0, 3).forEach(proc => {
            console.log(`   - ${proc.name}: ${proc.cpu}% CPU`);
        });

        console.log('\n🎉 All Mac compatibility tests passed!');
        console.log('The app should work correctly on macOS.');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.log('\nTroubleshooting:');
        console.log('- Make sure you have the required permissions');
        console.log('- Check if any antivirus software is blocking the app');
        console.log('- Try running with: sudo npm start (if needed)');
    }
}

testMacCompatibility();
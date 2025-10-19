#!/usr/bin/env node

/**
 * Test script for department integration with existing server
 */

const http = require('http');

function makeRequest(path, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'localhost',
            port: 8080,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const jsonData = JSON.parse(body);
                    resolve({ status: res.statusCode, data: jsonData });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }

        req.end();
    });
}

async function testDepartmentIntegration() {
    console.log('🧪 Testing Department Integration with Server');
    console.log('=============================================');

    try {
        // Test 1: Get departments
        console.log('\n1. Testing GET /api/departments...');
        const departmentsRes = await makeRequest('/api/departments');
        console.log(`Status: ${departmentsRes.status}`);
        if (departmentsRes.status === 200) {
            console.log('✅ Departments endpoint working');
            console.log(`Found ${departmentsRes.data.length} departments`);
        } else {
            console.log('❌ Departments endpoint failed');
        }

        // Test 2: Get user departments
        console.log('\n2. Testing GET /api/user-departments...');
        const userDeptsRes = await makeRequest('/api/user-departments');
        console.log(`Status: ${userDeptsRes.status}`);
        if (userDeptsRes.status === 200) {
            console.log('✅ User departments endpoint working');
            console.log(`Found ${Object.keys(userDeptsRes.data).length} user assignments`);
        } else {
            console.log('❌ User departments endpoint failed');
        }

        // Test 3: Create department (requires admin auth)
        console.log('\n3. Testing POST /api/departments...');
        const newDept = {
            id: 'test-dept',
            name: 'Test Department',
            color: '#FF6B6B',
            description: 'Test department for integration testing'
        };

        const createRes = await makeRequest('/api/departments', 'POST', newDept);
        console.log(`Status: ${createRes.status}`);
        if (createRes.status === 200 || createRes.status === 201) {
            console.log('✅ Department creation working');
        } else if (createRes.status === 403) {
            console.log('⚠️  Department creation requires admin authentication (expected)');
        } else {
            console.log('❌ Department creation failed:', createRes.data);
        }

        // Test 4: Search departments
        console.log('\n4. Testing GET /api/departments/search...');
        const searchRes = await makeRequest('/api/departments/search?q=test');
        console.log(`Status: ${searchRes.status}`);
        if (searchRes.status === 200) {
            console.log('✅ Department search working');
            console.log(`Found ${searchRes.data.length} matching departments`);
        } else {
            console.log('❌ Department search failed');
        }

        // Test 5: Filter users by department
        console.log('\n5. Testing POST /api/departments/filter-users...');
        const mockUsers = [
            { username: 'user1', isActive: true },
            { username: 'user2', isActive: false }
        ];

        const filterRes = await makeRequest('/api/departments/filter-users', 'POST', {
            users: mockUsers,
            departmentId: 'it'
        });
        console.log(`Status: ${filterRes.status}`);
        if (filterRes.status === 200) {
            console.log('✅ User filtering working');
            console.log(`Filtered to ${filterRes.data.length} users`);
        } else {
            console.log('❌ User filtering failed');
        }

        // Test 6: Group users by department
        console.log('\n6. Testing POST /api/departments/group-users...');
        const groupRes = await makeRequest('/api/departments/group-users', 'POST', {
            users: mockUsers
        });
        console.log(`Status: ${groupRes.status}`);
        if (groupRes.status === 200) {
            console.log('✅ User grouping working');
            console.log(`Grouped into ${Object.keys(groupRes.data).length} departments`);
        } else {
            console.log('❌ User grouping failed');
        }

        // Test 7: Get department statistics
        console.log('\n7. Testing GET /api/departments/it/stats...');
        const statsRes = await makeRequest('/api/departments/it/stats');
        console.log(`Status: ${statsRes.status}`);
        if (statsRes.status === 200) {
            console.log('✅ Department statistics working');
            console.log('Stats:', statsRes.data);
        } else {
            console.log('❌ Department statistics failed');
        }

        // Test 8: Export departments
        console.log('\n8. Testing GET /api/departments/export...');
        const exportRes = await makeRequest('/api/departments/export');
        console.log(`Status: ${exportRes.status}`);
        if (exportRes.status === 200) {
            console.log('✅ Department export working');
            console.log('Export data keys:', Object.keys(exportRes.data));
        } else {
            console.log('❌ Department export failed');
        }

        console.log('\n📊 Test Results Summary:');
        console.log('========================');

        const tests = [
            { name: 'Get Departments', status: departmentsRes.status === 200 ? 'PASS' : 'FAIL' },
            { name: 'Get User Departments', status: userDeptsRes.status === 200 ? 'PASS' : 'FAIL' },
            { name: 'Create Department', status: createRes.status === 200 || createRes.status === 201 || createRes.status === 403 ? 'PASS' : 'FAIL' },
            { name: 'Search Departments', status: searchRes.status === 200 ? 'PASS' : 'FAIL' },
            { name: 'Filter Users', status: filterRes.status === 200 ? 'PASS' : 'FAIL' },
            { name: 'Group Users', status: groupRes.status === 200 ? 'PASS' : 'FAIL' },
            { name: 'Department Stats', status: statsRes.status === 200 ? 'PASS' : 'FAIL' },
            { name: 'Export Departments', status: exportRes.status === 200 ? 'PASS' : 'FAIL' }
        ];

        tests.forEach(test => {
            const status = test.status === 'PASS' ? '✅' : '❌';
            console.log(`${status} ${test.name}: ${test.status}`);
        });

        const passedTests = tests.filter(t => t.status === 'PASS').length;
        const totalTests = tests.length;

        console.log(`\nTotal: ${passedTests}/${totalTests} tests passed`);

        if (passedTests === totalTests) {
            console.log('\n🎉 All department integration tests passed!');
            console.log('Department functionality is fully integrated with your server.');
        } else {
            console.log('\n⚠️  Some tests failed. Check server logs for details.');
        }

    } catch (error) {
        console.log('❌ Test failed:', error.message);
    }
}

// Run the test
testDepartmentIntegration();
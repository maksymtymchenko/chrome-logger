const axios = require('axios');

async function testBackendConnection() {
    const serverUrl = 'http://localhost:8080';

    console.log('Testing backend connection...');

    try {
        // Test health endpoint
        const healthResponse = await axios.get(`${serverUrl}/api/health`);
        console.log('✅ Health check passed:', healthResponse.data);

        // Test activity collection endpoint
        const testActivity = {
            events: [{
                username: 'test-user',
                deviceId: 'test-device-123',
                domain: 'windows-desktop',
                timestamp: Date.now(),
                type: 'window_activity',
                data: {
                    application: 'test-app.exe',
                    title: 'Test Window',
                    duration: 5000,
                    isIdle: false
                }
            }]
        };

        const activityResponse = await axios.post(`${serverUrl}/collect-activity`, testActivity);
        console.log('✅ Activity collection test passed:', activityResponse.data);

        // Test tracking data endpoint
        const testTracking = {
            events: [{
                username: 'test-user',
                timestamp: Date.now(),
                dataType: 'formInteraction',
                data: {
                    action: 'focus',
                    fieldType: 'text',
                    fieldName: 'test-field',
                    pageUrl: 'https://example.com'
                }
            }]
        };

        const trackingResponse = await axios.post(`${serverUrl}/collect-tracking`, testTracking);
        console.log('✅ Tracking data test passed:', trackingResponse.data);

        console.log('\n🎉 All backend tests passed! The Windows app should work correctly.');

    } catch (error) {
        console.error('❌ Backend test failed:', error.message);
        if (error.response) {
            console.error('Response status:', error.response.status);
            console.error('Response data:', error.response.data);
        }
        console.log('\nMake sure the backend server is running on http://localhost:8080');
    }
}

testBackendConnection();
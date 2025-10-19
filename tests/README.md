# Tests Directory

This directory contains all test files for the Keylogger Chrome project. The tests are organized by functionality and can be run independently to verify different aspects of the system.

## Test Files Overview

### 🔧 Core Functionality Tests

#### `test-backend.js`

- **Purpose**: Tests the server backend functionality
- **Usage**: `node test-backend.js`
- **What it tests**: Server startup, API endpoints, data collection

#### `test-mac.js`

- **Purpose**: Tests macOS-specific functionality
- **Usage**: `node test-mac.js`
- **What it tests**: macOS window tracking, activity detection

### 📋 Clipboard Tests

#### `test-clipboard.js`

- **Purpose**: Basic clipboard access and functionality test
- **Usage**: `node test-clipboard.js`
- **What it tests**: Clipboard read/write operations, permissions

#### `test-clipboard-url.js`

- **Purpose**: Tests clipboard URL detection and tracking
- **Usage**: `node test-clipboard-url.js`
- **What it tests**: URL extraction from clipboard, type detection

#### `debug-clipboard.js`

- **Purpose**: Comprehensive clipboard tracking debugging
- **Usage**: `node debug-clipboard.js`
- **What it tests**: Full clipboard tracking workflow, server communication

### 🖥️ Background Mode Tests

#### `test-background.js`

- **Purpose**: Tests background mode functionality
- **Usage**: `node test-background.js`
- **What it tests**: App running in background, tray functionality

### 🖼️ Screenshot Tests

#### `test-screenshot-delete.js`

- **Purpose**: Tests screenshot deletion functionality
- **Usage**: `node test-screenshot-delete.js`
- **What it tests**: Single and bulk screenshot deletion APIs

#### `test-dashboard-stats.js`

- **Purpose**: Tests dashboard statistics loading
- **Usage**: `node test-dashboard-stats.js`
- **What it tests**: API endpoint, stats calculation, data loading

#### `test-dashboard-elements.js`

- **Purpose**: Tests dashboard HTML elements and IDs
- **Usage**: `node test-dashboard-elements.js`
- **What it tests**: Element existence, duplicate ID detection, HTML structure

#### `test-screenshot-stats.js`

- **Purpose**: Tests screenshot statistics loading
- **Usage**: `node test-screenshot-stats.js`
- **What it tests**: Screenshots API, count display, stat card updates

#### `test-username-change-removal.js`

- **Purpose**: Tests username change functionality removal
- **Usage**: `node test-username-change-removal.js`
- **What it tests**: HTML elements, JavaScript functions, UI simplification

## Running Tests

### Prerequisites

1. Make sure the server is running: `cd ../server && node server.js`
2. Ensure the Windows app is built and dependencies are installed

### Individual Test Execution

```bash
# Test clipboard functionality
node test-clipboard.js

# Test URL detection in clipboard
node test-clipboard-url.js

# Debug clipboard tracking issues
node debug-clipboard.js

# Test background mode
node test-background.js

# Test screenshot deletion
node test-screenshot-delete.js

# Test backend functionality
node test-backend.js

# Test macOS functionality
node test-mac.js
```

### Running All Tests

```bash
# Run all tests in sequence
for test in *.js; do
  if [[ "$test" != "README.md" ]]; then
    echo "Running $test..."
    node "$test"
    echo "---"
  fi
done
```

## Test Categories

### ✅ Unit Tests

- `test-clipboard.js` - Clipboard access
- `test-clipboard-url.js` - URL detection logic

### 🔄 Integration Tests

- `debug-clipboard.js` - Full clipboard tracking workflow
- `test-background.js` - Background mode integration

### 🌐 API Tests

- `test-backend.js` - Server API endpoints
- `test-screenshot-delete.js` - Screenshot management APIs

### 🖥️ Platform Tests

- `test-mac.js` - macOS-specific functionality

## Troubleshooting

### Common Issues

1. **Permission Errors**

   - On macOS, ensure accessibility permissions are granted
   - Check clipboard access permissions

2. **Server Connection Errors**

   - Ensure server is running on `http://localhost:8080`
   - Check firewall settings

3. **File Path Issues**
   - Some tests may need path adjustments if moved
   - Check relative paths in test files

### Debug Mode

Most test files include detailed console output to help identify issues. Look for:

- ✅ Success indicators
- ❌ Error indicators
- 🔍 Debug information

## Contributing

When adding new tests:

1. Follow the naming convention: `test-[feature].js` or `debug-[feature].js`
2. Include comprehensive error handling
3. Add clear success/failure indicators
4. Update this README with test description
5. Test both success and failure scenarios

## Notes

- Tests are designed to be non-destructive where possible
- Some tests create temporary files that are cleaned up automatically
- All tests include proper error handling and user feedback
- Tests can be run independently or as part of a test suite

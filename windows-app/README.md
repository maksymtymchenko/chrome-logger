# Windows Activity Tracker

A Windows desktop application that tracks user activity, applications, clipboard usage, and takes screenshots. Integrates with the existing Chrome extension backend.

## Features

- **Simple Setup**: Just enter your name and start tracking
- **Application Tracking**: Monitor which applications are running and their resource usage
- **Window Activity**: Track active windows and time spent in each application
- **Clipboard Monitoring**: Track clipboard usage and content type detection
- **Screenshot Capture**: Take screenshots on specific events (window changes, clicks)
- **Idle Detection**: Detect when user is idle and pause tracking
- **System Tray**: Runs silently in the background
- **No UI Clutter**: Clean, minimal interface - just name entry and confirmation

## Installation

1. **Prerequisites**:

   - Node.js (v16 or higher)
   - Windows 10/11, macOS 10.14+, or Linux
   - Internet connection (connects to backend at https://chrome-logger.onrender.com)

2. **Install Dependencies**:

   ```bash
   cd windows-app
   npm install
   ```

3. **Run the Application**:

   ```bash
   npm start
   ```

4. **Build Executable** (optional):
   ```bash
   npm run build
   ```

## Configuration

The app stores configuration in `~/.windows-activity-tracker/config.json`:

```json
{
  "username": "YourUsername",
  "serverUrl": "https://chrome-logger.onrender.com",
  "trackingInterval": 5000,
  "trackClipboard": true,
  "trackApplications": true,
  "trackWindows": true,
  "trackScreenshots": true,
  "screenshotOnWindowChange": true,
  "screenshotOnClick": true,
  "minActivityDuration": 1000,
  "maxIdleTime": 300000,
  "workApplications": ["chrome.exe", "code.exe", "word.exe"],
  "personalApplications": ["steam.exe", "discord.exe", "spotify.exe"]
}
```

## Usage

### Simple Setup

1. **Launch the app**: Run `npm start` or double-click the executable
2. **Enter your name**: Type your name in the input field
3. **Start tracking**: Click "Start Tracking" button
4. **Minimize**: The app will automatically minimize to system tray after 3 seconds

### Background Operation

- The app runs silently in the background
- All tracking happens automatically
- Access via system tray icon (right-click for options)
- No need to interact with the app after initial setup

## Keyboard Shortcuts

- `Ctrl + T`: Toggle tracking on/off
- `Alt + F4`: Close application (minimizes to tray)

## Data Collection

The app collects the following data:

### Window Activity

- Application name and path
- Window title
- Time spent in each window
- Window bounds and position

### Clipboard Data

- Content type (text, URL, email, number)
- Content length
- Timestamp of clipboard changes

### Screenshots

- Event-based desktop screenshots (window changes, clicks)
- Timestamp and reason for capture
- Stored locally and metadata sent to server

### Application Data

- Running processes
- CPU and memory usage
- Process names and PIDs

## Privacy & Security

- **No sensitive data**: Only metadata is collected, not actual content
- **Local storage**: Screenshots stored locally in user directory
- **Configurable**: Users can disable any tracking feature
- **Secure transmission**: Data sent to configured server endpoint

## Integration with Backend

The Windows app uses the same backend as the Chrome extension:

- **Activity Data**: Sent to `/collect-activity` endpoint
- **Tracking Data**: Sent to `/collect-tracking` endpoint
- **Screenshots**: Metadata sent to server, files stored locally
- **Authentication**: Uses same username system as Chrome extension

## Troubleshooting

### Common Issues

1. **App won't start**:

   - Check Node.js version (requires v16+)
   - Run `npm install` to ensure dependencies are installed

2. **Tracking not working**:

   - Check server is running on configured URL
   - Verify username is set in settings
   - Check Windows permissions for screen capture

3. **Screenshots not working**:

   - Ensure Windows allows screen capture
   - Check screenshot directory permissions
   - Verify `trackScreenshots` is enabled in settings

4. **Clipboard access denied**:
   - Some antivirus software blocks clipboard access
   - Run as administrator if needed
   - Check Windows privacy settings

### Logs

Check the console output for error messages. The app logs all major operations and errors.

## Development

### Project Structure

```
windows-app/
├── main.js                 # Main Electron process
├── src/
│   ├── activityTracker.js  # Core tracking logic
│   ├── configManager.js    # Configuration management
│   └── renderer/           # UI components
│       ├── index.html      # Main UI
│       ├── styles.css      # Styling
│       └── renderer.js     # UI logic
├── assets/                 # Icons and images
└── package.json           # Dependencies and scripts
```

### Building from Source

1. Clone the repository
2. Install dependencies: `npm install`
3. Run development version: `npm start`
4. Build executable: `npm run build`

## License

MIT License - see main project LICENSE file.

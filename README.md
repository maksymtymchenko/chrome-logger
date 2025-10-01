# 🚀 Enhanced Activity Collector

A privacy-first Chrome extension and dashboard system for tracking browsing activity with modern UI, real-time analytics, and comprehensive reporting features.

## ✨ Features

### 🔧 Chrome Extension

- **Modern Popup UI**: Beautiful, responsive popup with real-time activity tracking
- **Privacy-First Design**: Only tracks domains and time - no keystrokes or content
- **Smart Domain Management**: Easy exclusion of domains from tracking
- **Real-time Status**: Live indicators showing current tracking status
- **Local Data Storage**: Activity data stored locally for popup display
- **Export Capabilities**: Export personal activity data in JSON format

### 📊 Dashboard

- **Modern Design**: Beautiful gradient UI with glassmorphism effects
- **Real-time Updates**: Live data refresh every 15 seconds
- **Interactive Charts**: Dynamic domain activity visualization with Chart.js
- **Advanced Filtering**: Search by user, domain, time range, and reason
- **Pagination**: Efficient handling of large datasets
- **Screenshot Gallery**: View and manage captured screenshots
- **Export Features**: Download data in CSV, JSON, and Excel formats

### 🖥️ Server

- **Enhanced API**: RESTful endpoints with comprehensive error handling
- **Data Validation**: Robust input validation and sanitization
- **Analytics Endpoints**: Advanced analytics and reporting APIs
- **Health Monitoring**: System health check endpoints
- **CORS Support**: Proper cross-origin resource sharing
- **Error Handling**: Comprehensive error handling and logging

## 🛠️ Installation

### Prerequisites

- Node.js (v14 or higher)
- Chrome browser
- Git

### Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd keylogger-chrome
   ```

2. **Install server dependencies**

   ```bash
   cd server
   npm install
   ```

3. **Start the server**

   ```bash
   npm start
   # or
   node server.js
   ```

4. **Load the Chrome extension**
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the project root directory
   - The extension should now appear in your extensions list

## 🚀 Usage

### Chrome Extension

1. **Click the extension icon** to open the popup
2. **Set your username** in the popup or options page
3. **Configure excluded domains** in the options page
4. **Monitor your activity** in real-time through the popup

### Dashboard

1. **Open the dashboard** at `http://localhost:8080/dashboard`
2. **View real-time analytics** and activity charts
3. **Filter and search** through activity logs
4. **Export data** in various formats
5. **Monitor screenshots** captured by the extension

## 📁 Project Structure

```
keylogger-chrome/
├── manifest.json              # Extension manifest
├── popup.html                 # Extension popup UI
├── popup.js                   # Popup functionality
├── options.html               # Extension options page
├── options.js                 # Options page functionality
├── background.js              # Extension background script
└── server/
    ├── server.js              # Express server
    ├── package.json           # Server dependencies
    ├── activity_log.json      # Activity data storage
    ├── screenshots/           # Screenshot storage
    └── dashboard/
        ├── index.html         # Dashboard UI
        └── chart.js           # Dashboard functionality
```

## 🔌 API Endpoints

### Activity Management

- `GET /api/activity` - Get activity events with filtering
- `POST /collect-activity` - Submit activity events
- `POST /collect-screenshot` - Submit screenshots

### Analytics

- `GET /api/analytics/summary` - Get summary statistics
- `GET /api/analytics/top-domains` - Get top domains by usage
- `GET /api/analytics/users` - Get user activity statistics

### Export

- `GET /api/export/csv` - Export data as CSV
- `GET /api/export/json` - Export data as JSON

### System

- `GET /api/health` - Health check endpoint
- `GET /ping` - Simple ping endpoint

## 🎨 UI Features

### Extension Popup

- **Live Status Indicator**: Shows current tracking status
- **Today's Statistics**: Displays today's activity time and domain count
- **Recent Activity**: Shows last 5 domains with duration and time ago
- **Quick Actions**: Direct links to dashboard and settings
- **Export Button**: Download personal activity data

### Options Page

- **Modern Design**: Beautiful gradient UI with glassmorphism effects
- **Domain Management**: Add/remove excluded domains with validation
- **User Settings**: Set username for activity logs
- **Statistics Cards**: Real-time stats display
- **Bulk Operations**: Clear all domains functionality

### Dashboard

- **Responsive Design**: Works on desktop and mobile devices
- **Real-time Updates**: Auto-refresh every 15 seconds
- **Interactive Charts**: Hover effects and tooltips
- **Advanced Filtering**: Multiple filter options
- **Export Features**: Multiple export formats
- **Screenshot Gallery**: Grid view with pagination

## 🔒 Privacy & Security

- **No Keystroke Logging**: Only tracks domains and time
- **No Content Collection**: No page content or personal data stored
- **Local Storage**: Activity data stored locally in browser
- **Hashed Device IDs**: Device identifiers are hashed for privacy
- **Optional Screenshots**: Screenshots only taken for work domains
- **Data Export**: Users can export and delete their data

## 🚀 Performance

- **Efficient Data Storage**: JSON-based storage with size limits
- **Lazy Loading**: Screenshots loaded on demand
- **Debounced Search**: Optimized search input handling
- **Pagination**: Large datasets handled efficiently
- **Caching**: Smart caching of frequently accessed data

## 🛠️ Development

### Running in Development Mode

1. **Start the server**

   ```bash
   cd server
   npm start
   ```

2. **Load the extension**

   - Load the extension in Chrome developer mode
   - Make changes to files
   - Reload the extension to see changes

3. **View logs**
   - Check browser console for extension logs
   - Check server console for API logs

### File Structure

- **Extension Files**: All extension files in root directory
- **Server Files**: All server files in `/server` directory
- **Dashboard Files**: Dashboard files in `/server/dashboard` directory

## 📊 Analytics Features

### Summary Statistics

- Total events, users, and domains
- Today, this week, and this month breakdowns
- Duration calculations in minutes

### Top Domains

- Most visited domains by time spent
- Visit counts and average time per visit
- Last visit timestamps

### User Analytics

- Per-user activity statistics
- Unique domains per user
- Total time and event counts

## 🔄 Real-time Features

- **Live Status Updates**: Extension popup updates in real-time
- **Auto-refresh Dashboard**: Dashboard updates every 15 seconds
- **Live Activity Feed**: Recent activity updates automatically
- **Status Indicators**: Visual indicators for tracking status

## 📱 Mobile Support

- **Responsive Design**: Dashboard works on mobile devices
- **Touch-friendly UI**: Large buttons and touch targets
- **Mobile-optimized Layout**: Stacked layout for small screens

## 🎯 Future Enhancements

- [ ] User authentication and multi-user support
- [ ] Advanced analytics and reporting
- [ ] Data encryption and enhanced security
- [ ] Mobile app companion
- [ ] Team collaboration features
- [ ] Advanced filtering and search
- [ ] Custom dashboard widgets
- [ ] API rate limiting and security

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support, please open an issue on GitHub or contact the development team.

---

**Built with ❤️ for privacy-conscious productivity tracking**

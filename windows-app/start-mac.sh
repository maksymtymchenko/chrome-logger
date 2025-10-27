#!/bin/bash
echo "Starting Activity Tracker on macOS..."
echo ""
echo "Backend URL: https://chrome-logger.onrender.com"
echo ""
cd "$(dirname "$0")"
npm start

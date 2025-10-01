#!/bin/bash
echo "Starting Activity Tracker on macOS..."
echo ""
echo "Make sure the backend server is running on http://localhost:8080"
echo ""
cd "$(dirname "$0")"
npm start

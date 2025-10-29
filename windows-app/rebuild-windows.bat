@echo off
echo Rebuilding Windows Activity Tracker...

echo Removing old build...
rmdir /s /q node_modules dist

echo Installing dependencies...
call npm install

echo Building Windows app...
call npm run build

echo.
echo Build complete! Check the dist folder for the installer.
pause


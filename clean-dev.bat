@echo off
echo Cleaning AqwaCloud development environment...
echo.

echo Stopping all Node.js processes...
taskkill /f /im node.exe >nul 2>&1

echo Cleaning build cache...
if exist .next rmdir /s /q .next

echo Clearing npm cache...
npm cache clean --force

echo.
echo Starting fresh development server...
echo.
npm run dev

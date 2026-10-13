@echo off
setlocal
cd /d "%~dp0"
title NumPy Data Filtering Lab - Task 13

echo.
echo =============================================
echo     NUMPY DATA FILTERING LAB - TASK 13
echo =============================================
echo.

where py >nul 2>nul
if %errorlevel%==0 (
    set "PYTHON_CMD=py"
) else (
    where python >nul 2>nul
    if %errorlevel%==0 (
        set "PYTHON_CMD=python"
    ) else (
        echo ERROR: Python was not found.
        echo Install Python from https://www.python.org/downloads/windows/
        echo During setup, tick "Add Python to PATH", then reopen this file.
        pause
        exit /b 1
    )
)

echo [1/2] Checking and installing the required NumPy package...
%PYTHON_CMD% -m pip install -r requirements.txt
if errorlevel 1 (
    echo.
    echo NumPy installation failed. Check your internet connection and try again.
    echo If pip is missing, run: %PYTHON_CMD% -m ensurepip --upgrade
    pause
    exit /b 1
)

echo.
echo [2/2] Starting the web app...
%PYTHON_CMD% app.py
if errorlevel 1 (
    echo.
    echo The app stopped because of an error. Read the message above.
    pause
)
endlocal

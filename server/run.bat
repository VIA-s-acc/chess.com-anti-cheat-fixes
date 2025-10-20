@echo off
echo =====================================
echo Chess Anti-Cheat Server Launcher
echo =====================================
echo.

REM Check if venv exists
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
    echo.
)

REM Activate venv
echo Activating virtual environment...
call venv\Scripts\activate
echo.

REM Install dependencies
echo Installing/Updating dependencies...
pip install -q -r requirements.txt
echo.

REM Run server
echo Starting server...
echo Server will be available at: http://localhost:8000
echo API Docs: http://localhost:8000/docs
echo Health Check: http://localhost:8000/health
echo.
echo Press Ctrl+C to stop the server
echo =====================================
echo.

python main.py

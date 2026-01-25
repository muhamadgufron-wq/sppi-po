@echo off
setlocal enabledelayedexpansion

echo ========================================
echo SPPI Backend - Database Setup
echo ========================================
echo.

REM MySQL path
set "MYSQL_PATH=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe"

REM Check if MySQL exists
if not exist "%MYSQL_PATH%" (
    echo MySQL not found at default location
    echo Please enter the full path to mysql.exe:
    set /p MYSQL_PATH="Path: "
)

echo Using MySQL: %MYSQL_PATH%
echo.

REM Get credentials
set /p DB_USER="MySQL username (default: root): "
if "%DB_USER%"=="" set DB_USER=root

set /p DB_PASS="MySQL password: "

echo.
echo ========================================
echo Executing SQL setup...
echo ========================================
echo.

REM Get absolute path to SQL file
set "SQL_FILE=%~dp0..\database\setup_complete.sql"

echo SQL File: %SQL_FILE%
echo.

REM Execute setup script
"%MYSQL_PATH%" -u %DB_USER% -p%DB_PASS% < "%SQL_FILE%" 2>&1

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo SUCCESS - Database setup completed!
    echo ========================================
    echo.
    echo Default users created:
    echo - admin / password123
    echo - manajer / password123  
    echo - keuangan / password123
    echo - lapangan / password123
    echo.
    
    REM Update .env
    echo Updating .env file...
    (
        echo NODE_ENV=development
        echo.
        echo # Server
        echo PORT=3000
        echo.
        echo # Database
        echo DB_HOST=localhost
        echo DB_PORT=3306
        echo DB_USER=%DB_USER%
        echo DB_PASSWORD=%DB_PASS%
        echo DB_NAME=sppi_po
        echo.
        echo # JWT
        echo JWT_SECRET=dev-secret-key-12345
        echo JWT_EXPIRES_IN=7d
        echo.
        echo # File Upload
        echo UPLOAD_DIR=./uploads
        echo MAX_FILE_SIZE=5242880
    ) > .env
    
    echo.
    echo ✓ .env file updated
    echo.
    echo ========================================
    echo Next steps:
    echo ========================================
    echo 1. Restart server (Ctrl+C then npm run dev^)
    echo 2. Run tests in new terminal: npm test
    echo.
) else (
    echo.
    echo ========================================
    echo ERROR - Setup failed!
    echo ========================================
    echo.
    echo Please check:
    echo - MySQL username: %DB_USER%
    echo - MySQL password is correct
    echo - MySQL server is running
    echo - SQL file exists at: %SQL_FILE%
    echo.
    echo Error code: %ERRORLEVEL%
    echo.
)

pause

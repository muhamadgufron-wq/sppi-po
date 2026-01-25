@echo off
echo ========================================
echo Setup Database - SPPI Purchase Order
echo ========================================
echo.

set /p DB_USER="Enter MySQL username (default: root): "
if "%DB_USER%"=="" set DB_USER=root

set /p DB_PASS="Enter MySQL password: "

echo.
echo Creating database and tables...
mysql -u %DB_USER% -p%DB_PASS% < ..\database\migrations\001_create_tables.sql

if %ERRORLEVEL% EQU 0 (
    echo ✓ Tables created successfully
    echo.
    echo Inserting seed data...
    mysql -u %DB_USER% -p%DB_PASS% < ..\database\seeds\001_seed_data.sql
    
    if %ERRORLEVEL% EQU 0 (
        echo ✓ Seed data inserted successfully
        echo.
        echo ========================================
        echo Database setup completed!
        echo ========================================
        echo.
        echo Default users created:
        echo - admin / password123
        echo - manajer / password123
        echo - keuangan / password123
        echo - lapangan / password123
        echo.
    ) else (
        echo ✗ Failed to insert seed data
    )
) else (
    echo ✗ Failed to create tables
)

pause

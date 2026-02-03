@echo off
echo ========================================
echo Add Profit Analysis Columns Migration
echo ========================================
echo.

set /p DB_USER="Enter MySQL username (default: root): "
if "%DB_USER%"=="" set DB_USER=root

set /p DB_PASS="Enter MySQL password: "

echo.
echo Running migration...
mysql -u %DB_USER% -p%DB_PASS% < ..\database\migrations\002_add_profit_analysis.sql

if %ERRORLEVEL% EQU 0 (
    echo ✓ Migration completed successfully
    echo.
    echo Profit analysis columns added to po_items table:
    echo - estimasi_susut
    echo - harga_modal
    echo - total_modal
    echo - harga_jual
    echo - total_harga_jual
    echo - profit
    echo - margin
    echo.
) else (
    echo ✗ Migration failed
)

pause

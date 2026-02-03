@echo off
echo ========================================
echo Cleanup Unused Columns Migration
echo ========================================
echo.
echo This will remove the following duplicate columns:
echo - real_qty (duplicate of qty_real)
echo - real_price (duplicate of harga_real)
echo - purchase_proof (duplicate of bukti_foto)
echo - subtotal_approved (not used)
echo.

set /p CONFIRM="Continue with cleanup? (Y/N): "
if /i not "%CONFIRM%"=="Y" (
    echo Migration cancelled.
    pause
    exit /b
)

set /p DB_USER="Enter MySQL username (default: root): "
if "%DB_USER%"=="" set DB_USER=root

set /p DB_PASS="Enter MySQL password: "

echo.
echo Running cleanup migration...
mysql -u %DB_USER% -p%DB_PASS% < ..\database\migrations\003_cleanup_unused_columns.sql

if %ERRORLEVEL% EQU 0 (
    echo ✓ Cleanup completed successfully
    echo.
    echo Removed columns:
    echo - real_qty
    echo - real_price
    echo - purchase_proof
    echo - subtotal_approved
    echo.
) else (
    echo ✗ Migration failed
)

pause

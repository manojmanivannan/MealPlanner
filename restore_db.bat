@echo off
REM Restore PostgreSQL database to Docker Compose service
REM Usage: restore_db.bat [backup_filename.sql]

setlocal
set CONTAINER_NAME=mealplanner-db-1
set DB_NAME=recipes
set DB_USER=postgres
set BACKUP_FILE=%~1
if "%BACKUP_FILE%"=="" set BACKUP_FILE=backup.sql

echo Restoring database %DB_NAME% in container %CONTAINER_NAME% from %BACKUP_FILE% ...
type %BACKUP_FILE% | docker exec -i %CONTAINER_NAME% psql -U %DB_USER% -d %DB_NAME%
if %ERRORLEVEL% NEQ 0 (
    echo Restore failed!
    exit /b 1
) else (
    echo Restore completed from: %BACKUP_FILE%
)
endlocal

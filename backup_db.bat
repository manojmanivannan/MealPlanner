@echo off
REM Backup PostgreSQL database from Docker Compose service
REM Usage: backup_db.bat [backup_filename.sql]

setlocal
set CONTAINER_NAME=mealplanner-db-1
set DB_NAME=recipes
set DB_USER=postgres
set BACKUP_FILE=%~1
if "%BACKUP_FILE%"=="" set BACKUP_FILE=backup.sql

echo Backing up database %DB_NAME% from container %CONTAINER_NAME% to %BACKUP_FILE% ...
docker exec -t %CONTAINER_NAME% pg_dump -U %DB_USER% -d %DB_NAME% > %BACKUP_FILE%
if %ERRORLEVEL% NEQ 0 (
    echo Backup failed!
    exit /b 1
) else (
    echo Backup completed: %BACKUP_FILE%
)
endlocal

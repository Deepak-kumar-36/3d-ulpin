@echo off
REM Run detection on all floor plans with debug overlays and cache saving.
REM Usage: run_all.bat

setlocal enabledelayedexpansion
cd /d "%~dp0"

echo === Vision: detect all plans ===
echo.

set count=0
for %%f in (plans\*.png) do (
    python run_vision.py run "%%f" --debug --save-cache
    set /a count+=1
)

if !count! == 0 (
    echo No .png files found in plans\
    exit /b 1
)

echo.
echo === Done: !count! plans processed ===
echo Output JSON:    out\*.json
echo Debug overlays: out\debug\*_overlay.png
echo Cache:          cache\*.json

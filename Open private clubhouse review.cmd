@echo off
setlocal
set "PLFC_REVIEW_SCRIPT=%~dp0scripts\review-club.mjs"
set "PLFC_REVIEW_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if not exist "%PLFC_REVIEW_NODE%" (
  echo This review requires Node 24 with built-in SQLite.
  pause
  exit /b 1
)
powershell.exe -NoProfile -NonInteractive -Command "Start-Process -FilePath $env:PLFC_REVIEW_NODE -ArgumentList @(([char]34 + $env:PLFC_REVIEW_SCRIPT + [char]34),'--open') -WindowStyle Hidden"

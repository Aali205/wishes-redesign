@echo off
cd /d "%~dp0dist"
where node >nul 2>nul && (npx --yes http-server . -p 5534 -o -c-1) || (start "" http://localhost:5534 & python -m http.server 5534)

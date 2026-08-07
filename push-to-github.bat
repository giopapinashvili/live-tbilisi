@echo off
setlocal
cd /d "%~dp0"

echo ============================================
echo   Tbilisi LIVE  --^>  GitHub
echo   github.com/giopapinashvili/live-tbilisi
echo ============================================
echo.

where git >nul 2>&1
if errorlevel 1 (
  echo [X] Git ver moidzebna.
  echo     Chamotvirte: https://git-scm.com/download/win
  echo     Shemdeg xelaxla gaushvi es faili.
  echo.
  pause
  exit /b 1
)

git rev-parse --is-inside-work-tree >nul 2>&1
if errorlevel 1 (
  echo [X] es sagadhaldhe ar aris git repo.
  pause
  exit /b 1
)

echo [1/3] Remote-is shemowmeba...
git remote get-url origin >nul 2>&1
if errorlevel 1 (
  git remote add origin https://github.com/giopapinashvili/live-tbilisi.git
  echo     remote daemata.
) else (
  git remote set-url origin https://github.com/giopapinashvili/live-tbilisi.git
  echo     remote ganaxlda.
)
git remote -v
echo.

echo [2/3] Branch: main
git branch -M main
echo.

echo [3/3] Push...
echo     (tu brauzeri gaixsneba - sheasrule GitHub-shi shesvla)
echo.
git push -u origin main
if errorlevel 1 (
  echo.
  echo ============================================
  echo [X] Push ver shesrulda.
  echo.
  echo   shesadzlo mizezebi:
  echo    - avtorizacia ar gaiara ^(brauzeris fanjara daixura^)
  echo    - repo-ze cerhis uplebi ar gaqvs
  echo    - internet kavshiri
  echo.
  echo   xelit cda:
  echo    git push -u origin main
  echo ============================================
  echo.
  pause
  exit /b 1
)

echo.
echo ============================================
echo [OK] Atvirtulia!
echo.
echo   https://github.com/giopapinashvili/live-tbilisi
echo.
echo   shemdegi nabiji - Cloudflare Pages:
echo    1. dash.cloudflare.com  --^>  Workers ^& Pages  --^>  Create
echo    2. Pages  --^>  Connect to Git  --^>  live-tbilisi
echo    3. Build command:      npm run build
echo    4. Output directory:   dist
echo    5. Environment: NODE_VERSION = 20
echo ============================================
echo.
pause

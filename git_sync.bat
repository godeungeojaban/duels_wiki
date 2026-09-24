@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

set "REMOTE_URL=https://github.com/godeungeojaban/duels_wiki.git"
set "BRANCH=main"
set "INITIAL_CONTENT=0"

echo ========================================
echo  Duels Wiki Git Sync
echo ========================================
echo [POLICY] wiki/ and media/ are user content. Existing remote content is preserved.
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git is not installed or not in PATH.
  pause
  exit /b 1
)

if exist ".git\rebase-merge" goto :unfinished_rebase
if exist ".git\rebase-apply" goto :unfinished_rebase
if exist ".git\MERGE_HEAD" goto :unfinished_merge
goto :ensure_repo

:unfinished_rebase
echo [WARNING] An unfinished rebase is already in progress.
choice /C AQ /N /M "[A] Abort old rebase and continue  [Q] Quit: "
if errorlevel 2 exit /b 2
git rebase --abort || goto :fail
goto :ensure_repo

:unfinished_merge
echo [WARNING] An unfinished merge is already in progress.
choice /C AQ /N /M "[A] Abort old merge and continue  [Q] Quit: "
if errorlevel 2 exit /b 2
git merge --abort || goto :fail
goto :ensure_repo

:ensure_repo
if not exist ".git" (
  echo [INFO] Initializing Git repository...
  git init || goto :fail
)

git remote get-url origin >nul 2>nul
if errorlevel 1 git remote add origin "%REMOTE_URL%" || goto :fail

git rev-parse --verify HEAD >nul 2>nul
if errorlevel 1 goto :fresh_repo
goto :existing_repo

:fresh_repo
echo [INFO] First sync in this extracted package.
git fetch origin %BRANCH%
if errorlevel 1 (
  echo [INFO] origin/%BRANCH% does not exist yet. Creating initial repository content.
  git branch -M %BRANCH% >nul 2>nul
  set "INITIAL_CONTENT=1"
  goto :stage_product
)
git rev-parse --verify origin/%BRANCH% >nul 2>nul
if errorlevel 1 (
  git branch -M %BRANCH% >nul 2>nul
  set "INITIAL_CONTENT=1"
  goto :stage_product
)
git branch -M %BRANCH% >nul 2>nul
git reset origin/%BRANCH% || goto :fail
call :restore_remote_content || goto :fail
goto :stage_product

:existing_repo
set "HAS_STASH=0"
for /f "delims=" %%A in ('git status --porcelain') do set "HAS_STASH=1"
if "!HAS_STASH!"=="1" (
  echo [1/5] Temporarily saving local changes...
  git stash push -u -m "DuelsWiki git_sync temporary changes" >nul || goto :fail
)
echo [2/5] Fetching origin/%BRANCH%...
git fetch origin %BRANCH% || goto :restore_stash_fail
git switch %BRANCH% >nul 2>nul
if errorlevel 1 git checkout %BRANCH% || goto :restore_stash_fail
echo [3/5] Rebasing product history onto origin/%BRANCH%...
git rebase origin/%BRANCH%
if errorlevel 1 goto :rebase_conflict_with_stash
if "!HAS_STASH!"=="1" (
  echo [4/5] Restoring local product changes...
  git stash pop
  if errorlevel 1 goto :stash_conflict
)
call :restore_remote_content || goto :fail
goto :stage_product

:restore_remote_content
rem GitHub is the source of truth for wiki/media. This deliberately replaces the package's
rem seed copies with the existing remote records so extracting an update cannot delete them.
git cat-file -e origin/%BRANCH%:wiki >nul 2>nul
if errorlevel 1 (
  set "INITIAL_CONTENT=1"
  echo [CONTENT] No remote wiki/ found; package seed will be used.
) else (
  git restore --source=origin/%BRANCH% --worktree -- wiki || exit /b 1
  echo [CONTENT] Restored existing wiki/ from origin/%BRANCH%.
)
git cat-file -e origin/%BRANCH%:media >nul 2>nul
if errorlevel 1 (
  set "INITIAL_CONTENT=1"
  echo [CONTENT] No remote media/ found; package seed will be used.
) else (
  git restore --source=origin/%BRANCH% --worktree -- media || exit /b 1
  git cat-file -e origin/%BRANCH%:media/images/.gitkeep >nul 2>nul
  if errorlevel 1 if exist "media\images\.gitkeep" del /q "media\images\.gitkeep" >nul 2>nul
  echo [CONTENT] Restored existing media/ from origin/%BRANCH%.
)
exit /b 0

:stage_product
echo [SYNC] Staging editor/site product files only...
rem IMPORTANT: Never use plain git add -A here. Update ZIPs intentionally do not contain
rem the user's complete wiki/media tree, so doing so would stage their records as deletions.
git add -A -- editor site .github/workflows DuelsWikiEditor.py git_sync.bat git_sync.sh .gitignore || goto :fail
rem README.md and VERSION.md are staged explicitly so documentation/version changes are never skipped.
git add -- README.md || goto :fail
git add -- VERSION.md || goto :fail
if "!INITIAL_CONTENT!"=="1" git add -A -- wiki media || goto :fail

git ls-files --error-unmatch README.md >nul 2>nul
if errorlevel 1 goto :fail
git ls-files --error-unmatch VERSION.md >nul 2>nul
if errorlevel 1 goto :fail
git diff --cached --name-only -- README.md | findstr /x /c:"README.md" >nul
if errorlevel 1 (
  echo [INFO] README.md has no content change; tracked remote copy is already current.
) else (
  echo [CHECK] README.md staged for this update.
)
git diff --cached --name-only -- VERSION.md | findstr /x /c:"VERSION.md" >nul
if errorlevel 1 (
  echo [INFO] VERSION.md has no content change; tracked remote copy is already current.
) else (
  echo [CHECK] VERSION.md staged for this update.
)
echo [CHECK] Product files staged; existing wiki/media records are protected.

git diff --cached --quiet
if errorlevel 1 (
  set "MSG="
  set /p "MSG=Commit message [Duels Wiki update]: "
  if not defined MSG set "MSG=Duels Wiki update"
  git commit -m "!MSG!" || goto :fail
) else (
  echo [INFO] No product changes to commit.
)

echo [PUSH] Pushing to origin/%BRANCH%...
git push -u origin %BRANCH%
if not errorlevel 1 goto :success

echo [INFO] Remote changed during sync. Fetching and retrying once...
git fetch origin %BRANCH% || goto :fail
git rebase origin/%BRANCH%
if errorlevel 1 goto :rebase_conflict
git push -u origin %BRANCH% || goto :fail
goto :success

:rebase_conflict_with_stash
echo [ERROR] Rebase conflict. No later Git commands were run.
git diff --name-only --diff-filter=U
if "!HAS_STASH!"=="1" echo Your temporary stash is still preserved by Git.
pause
exit /b 2

:rebase_conflict
echo [ERROR] Rebase conflict.
git diff --name-only --diff-filter=U
pause
exit /b 2

:stash_conflict
echo [ERROR] Restoring local changes caused a conflict.
git diff --name-only --diff-filter=U
pause
exit /b 3

:restore_stash_fail
if "!HAS_STASH!"=="1" git stash pop >nul 2>nul
goto :fail

:success
echo.
echo [OK] GitHub sync completed without replacing existing wiki/media records.
pause
exit /b 0

:fail
echo.
echo [ERROR] Git command failed. The script stopped immediately.
echo Run "git status" to inspect the repository state.
pause
exit /b 1

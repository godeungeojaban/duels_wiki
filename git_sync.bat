@echo off
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"

set "REMOTE_URL=https://github.com/godeungeojaban/duels_wiki.git"
set "BRANCH=main"

echo ========================================
echo  Duels Wiki Git Sync 3.8
echo ========================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo [ERROR] Git is not installed or not in PATH.
  pause
  exit /b 1
)

rem Stop or recover unfinished Git operations before doing anything else.
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
if errorlevel 1 (
  echo [INFO] Adding origin remote...
  git remote add origin "%REMOTE_URL%" || goto :fail
)

rem A repository with no HEAD needs a special first-sync path.
git rev-parse --verify HEAD >nul 2>nul
if errorlevel 1 goto :fresh_repo
goto :existing_repo

:fresh_repo
echo [INFO] No local commit exists yet. Running first-sync flow.
echo [1/4] Fetching origin/%BRANCH%...
git fetch origin %BRANCH%
if errorlevel 1 (
  echo [INFO] origin/%BRANCH% could not be fetched. Preparing a new %BRANCH% branch.
  git branch -M %BRANCH% >nul 2>nul
  goto :stage_commit_push
)

git rev-parse --verify origin/%BRANCH% >nul 2>nul
if errorlevel 1 (
  echo [INFO] origin/%BRANCH% does not exist. Preparing a new %BRANCH% branch.
  git branch -M %BRANCH% >nul 2>nul
  goto :stage_commit_push
)

rem IMPORTANT: mixed reset attaches remote history but does NOT replace working files.
rem Therefore the extracted 3.8 package stays in place, while remote-only old files
rem become deletions when git add -A is run below.
echo [2/4] Attaching remote history without replacing package files...
git branch -M %BRANCH% >nul 2>nul
git reset origin/%BRANCH% || goto :fail

echo [3/4] Remote history attached. Package files were left untouched.
goto :stage_commit_push

:existing_repo
rem Existing repository: temporarily stash local edits, update history, restore edits.
set "HAS_STASH=0"
for /f "delims=" %%A in ('git status --porcelain') do set "HAS_STASH=1"

if "!HAS_STASH!"=="1" (
  echo [1/5] Temporarily saving local changes...
  git stash push -u -m "DuelsWiki git_sync temporary changes" >nul || goto :fail
) else (
  echo [1/5] No uncommitted changes to stash.
)

echo [2/5] Fetching origin/%BRANCH%...
git fetch origin %BRANCH% || goto :restore_stash_fail

git switch %BRANCH% >nul 2>nul
if errorlevel 1 git checkout %BRANCH% || goto :restore_stash_fail

echo [3/5] Rebasing local commits onto origin/%BRANCH%...
git rebase origin/%BRANCH%
if errorlevel 1 goto :rebase_conflict_with_stash

if "!HAS_STASH!"=="1" (
  echo [4/5] Restoring local changes...
  git stash pop
  if errorlevel 1 goto :stash_conflict
) else (
  echo [4/5] No stashed changes to restore.
)

goto :stage_commit_push

:stage_commit_push
echo [SYNC] Staging repository files...
git add -A || goto :fail

rem Verify the two documentation files really belong to the repository commit.
git ls-files --error-unmatch README.md >nul 2>nul
if errorlevel 1 (
  echo [ERROR] README.md is not tracked from the repository root.
  goto :fail
)
git ls-files --error-unmatch VERSION.md >nul 2>nul
if errorlevel 1 (
  echo [ERROR] VERSION.md is not tracked from the repository root.
  goto :fail
)
echo [CHECK] README.md and VERSION.md are included in Git tracking.

git diff --cached --quiet
if errorlevel 1 (
  set "MSG="
  set /p "MSG=Commit message [Duels Wiki update]: "
  if not defined MSG set "MSG=Duels Wiki update"
  echo [INFO] Creating commit: !MSG!
  git commit -m "!MSG!" || goto :fail
) else (
  echo [INFO] No local changes to commit.
)

echo [PUSH] Pushing to origin/%BRANCH%...
git push -u origin %BRANCH%
if not errorlevel 1 goto :success

echo.
echo [INFO] Remote changed during sync. Fetching and retrying once...
git fetch origin %BRANCH% || goto :fail
git rebase origin/%BRANCH%
if errorlevel 1 goto :rebase_conflict
git push -u origin %BRANCH% || goto :fail
goto :success

:rebase_conflict_with_stash
echo.
echo [ERROR] Rebase conflict. No later Git commands were run.
git diff --name-only --diff-filter=U
echo.
echo Run: git rebase --abort
if "!HAS_STASH!"=="1" echo Your temporary stash is still preserved by Git.
pause
exit /b 2

:rebase_conflict
echo.
echo [ERROR] Rebase conflict. No later Git commands were run.
git diff --name-only --diff-filter=U
pause
exit /b 2

:stash_conflict
echo.
echo [ERROR] Restoring local changes caused a conflict.
git diff --name-only --diff-filter=U
pause
exit /b 3

:restore_stash_fail
if "!HAS_STASH!"=="1" git stash pop >nul 2>nul
goto :fail

:success
echo.
echo [OK] GitHub sync completed.
pause
exit /b 0

:fail
echo.
echo [ERROR] Git command failed. The script stopped immediately.
echo Run "git status" to inspect the repository state.
pause
exit /b 1

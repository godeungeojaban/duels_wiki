#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
REMOTE_URL="https://github.com/godeungeojaban/duels_wiki.git"
BRANCH="main"
echo "========================================"
echo " Duels Wiki Git Sync 3.8"
echo "========================================"
command -v git >/dev/null 2>&1 || { echo "[ERROR] git is not installed."; exit 1; }
[ -d .git ] || git init
if ! git remote get-url origin >/dev/null 2>&1; then git remote add origin "$REMOTE_URL"; fi
if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  echo "[INFO] First-sync flow"
  if git fetch origin "$BRANCH" && git rev-parse --verify "origin/$BRANCH" >/dev/null 2>&1; then
    git branch -M "$BRANCH" 2>/dev/null || true
    git reset "origin/$BRANCH"
  else
    git branch -M "$BRANCH" 2>/dev/null || true
  fi
else
  dirty=0
  [ -n "$(git status --porcelain)" ] && dirty=1
  [ "$dirty" -eq 1 ] && git stash push -u -m "DuelsWiki git_sync temporary changes" >/dev/null
  git fetch origin "$BRANCH"
  git switch "$BRANCH" 2>/dev/null || git checkout "$BRANCH"
  git rebase "origin/$BRANCH"
  [ "$dirty" -eq 1 ] && git stash pop
fi
git add -A
git ls-files --error-unmatch README.md >/dev/null
git ls-files --error-unmatch VERSION.md >/dev/null
echo "[CHECK] README.md and VERSION.md are included in Git tracking."
if ! git diff --cached --quiet; then
  printf 'Commit message [Duels Wiki update]: '
  read -r msg || true
  [ -n "${msg:-}" ] || msg="Duels Wiki update"
  git commit -m "$msg"
else
  echo "[INFO] No local changes to commit."
fi
git push -u origin "$BRANCH"
echo "[OK] GitHub sync completed."

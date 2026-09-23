#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
REMOTE_URL="https://github.com/godeungeojaban/duels_wiki.git"
BRANCH="main"
INITIAL_CONTENT=0

echo "========================================"
echo " Duels Wiki Git Sync 3.53"
echo "========================================"
echo "[POLICY] wiki/ and media/ are user content. Existing remote content is preserved."

command -v git >/dev/null 2>&1 || { echo "[ERROR] git is not installed."; exit 1; }
[ -d .git ] || git init
if ! git remote get-url origin >/dev/null 2>&1; then git remote add origin "$REMOTE_URL"; fi

restore_remote_content(){
  # The editor writes wiki/media directly to GitHub. During a product update the remote
  # branch is therefore the source of truth for user records. Restoring only these paths
  # prevents an extracted update package from turning remote-only pages into deletions.
  if git cat-file -e "origin/$BRANCH:wiki" 2>/dev/null; then
    git restore --source="origin/$BRANCH" --worktree -- wiki
    echo "[CONTENT] Restored existing wiki/ from origin/$BRANCH."
  else
    INITIAL_CONTENT=1
    echo "[CONTENT] No remote wiki/ found; package seed will be used."
  fi
  if git cat-file -e "origin/$BRANCH:media" 2>/dev/null; then
    git restore --source="origin/$BRANCH" --worktree -- media
    if ! git cat-file -e "origin/$BRANCH:media/images/.gitkeep" 2>/dev/null; then
      rm -f media/images/.gitkeep
    fi
    echo "[CONTENT] Restored existing media/ from origin/$BRANCH."
  else
    INITIAL_CONTENT=1
    echo "[CONTENT] No remote media/ found; package seed will be used."
  fi
}

if ! git rev-parse --verify HEAD >/dev/null 2>&1; then
  echo "[INFO] First sync in this extracted package."
  if git fetch origin "$BRANCH" && git rev-parse --verify "origin/$BRANCH" >/dev/null 2>&1; then
    git branch -M "$BRANCH" 2>/dev/null || true
    # Attach remote history while leaving the new product files in the worktree.
    git reset "origin/$BRANCH"
    restore_remote_content
  else
    echo "[INFO] origin/$BRANCH does not exist yet; creating a new repository state."
    git branch -M "$BRANCH" 2>/dev/null || true
    INITIAL_CONTENT=1
  fi
else
  dirty=0
  [ -n "$(git status --porcelain)" ] && dirty=1
  [ "$dirty" -eq 1 ] && git stash push -u -m "DuelsWiki git_sync temporary changes" >/dev/null
  git fetch origin "$BRANCH"
  git switch "$BRANCH" 2>/dev/null || git checkout "$BRANCH"
  git rebase "origin/$BRANCH"
  [ "$dirty" -eq 1 ] && git stash pop
  restore_remote_content
fi

# Product update paths only. Do not use plain `git add -A` here: an update ZIP does not
# contain the user's complete wiki/media tree, so doing so would stage those records as deletions.
git add -A -- editor site .github/workflows DuelsWikiEditor.py git_sync.bat git_sync.sh .gitignore
# Stage README.md and VERSION.md explicitly so docs/version changes are always part of the push.
git add -- README.md
git add -- VERSION.md
if [ "$INITIAL_CONTENT" -eq 1 ]; then
  git add -A -- wiki media
fi

git ls-files --error-unmatch README.md >/dev/null
git ls-files --error-unmatch VERSION.md >/dev/null
if git diff --cached --name-only -- README.md | grep -qx "README.md"; then
  echo "[CHECK] README.md staged for this update."
else
  echo "[INFO] README.md has no content change; tracked remote copy is already current."
fi
if git diff --cached --name-only -- VERSION.md | grep -qx "VERSION.md"; then
  echo "[CHECK] VERSION.md staged for this update."
else
  echo "[INFO] VERSION.md has no content change; tracked remote copy is already current."
fi
echo "[CHECK] Product files staged; existing wiki/media records are protected."

if ! git diff --cached --quiet; then
  printf 'Commit message [Duels Wiki update]: '
  read -r msg || true
  [ -n "${msg:-}" ] || msg="Duels Wiki update"
  git commit -m "$msg"
else
  echo "[INFO] No product changes to commit."
fi

git push -u origin "$BRANCH"
echo "[OK] GitHub sync completed without replacing existing wiki/media records."

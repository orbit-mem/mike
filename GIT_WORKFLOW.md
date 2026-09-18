````md
# Git Workflow

## Repository

```bash
git remote -v
````

## Remote Setup

```bash
git remote add upstream https://github.com/open-legal-products/mike.git
git remote -v
```

## Branches

```text
upstream/main
     ↓
origin/main
     ↓
origin/dev
```

## Update Main From Upstream

```bash
git checkout main
git fetch upstream
git status
git merge --ff-only upstream/main
git push origin main
```

## Update Dev From Main

```bash
git checkout dev
git status
git merge main
git push origin dev
```

## Complete Upstream Update Workflow

```bash
git checkout main
git fetch upstream
git status
git merge --ff-only upstream/main
git push origin main

git checkout dev
git status
git merge main
git push origin dev
```

## Development Workflow

```bash
git checkout dev
git status

git add .
git commit -m "Your change"
git push origin dev
```

## Check Branch Status

```bash
git status
git branch -vv
git log --oneline --graph --decorate --all
```

## Merge Conflicts

```bash
git status
```

```bash
# Fix the conflicted files

git add .
git commit
git push origin dev
```

## Abort Merge

```bash
git merge --abort
```

## Stash Uncommitted Changes

```bash
git stash
```

```bash
git checkout main
git fetch upstream
git merge --ff-only upstream/main
git push origin main

git checkout dev
git merge main
git push origin dev
```

```bash
git stash pop
```

## Never Develop On Main

```bash
git checkout dev
```

## Final Workflow

```bash
# Update upstream → main → dev

git checkout main
git fetch upstream
git merge --ff-only upstream/main
git push origin main

git checkout dev
git merge main
git push origin dev
```

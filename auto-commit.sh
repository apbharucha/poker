#!/bin/bash

# Auto-commit and push script - Runs hourly via cron
# Pushes to BOTH repositories and triggers Vercel deployment

set -e

# Change to project directory
cd /Users/aavibharucha/Documents/Projects/poker

# Ensure git config is set correctly
export GIT_AUTHOR_NAME="apbharucha"
export GIT_AUTHOR_EMAIL="apbharucha07@gmail.com"
export GIT_COMMITTER_NAME="apbharucha"
export GIT_COMMITTER_EMAIL="apbharucha07@gmail.com"

# Log files
LOG_FILE="/Users/aavibharucha/Documents/Projects/poker/auto-commit.log"
ERROR_LOG="/Users/aavibharucha/Documents/Projects/poker/auto-commit-error.log"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_FILE"
}

# Function to log errors
log_error() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" | tee -a "$ERROR_LOG"
}

log "=== Auto-commit started ==="

# Check if there are any changes
if [[ -z $(git status -s) ]]; then
    log "No changes to commit"
    log "=== Auto-commit completed (nothing to do) ==="
    exit 0
fi

# Show what changed
log "Changes detected:"
git status -s | tee -a "$LOG_FILE"

# Add all changes
git add -A
log "All changes staged"

# Create commit with timestamp
COMMIT_MSG="auto: hourly sync $(date '+%Y-%m-%d %H:%M')"
git commit -m "$COMMIT_MSG" >> "$LOG_FILE" 2>> "$ERROR_LOG" || {
    log_error "Commit failed"
    exit 1
}
log "Committed: $COMMIT_MSG"

# Push to poker repository
log "Pushing to poker repository..."
git push origin main >> "$LOG_FILE" 2>> "$ERROR_LOG" || {
    log_error "Push to poker failed"
    exit 1
}
log "✓ Pushed to poker"

# Push to aipokerboost repository (triggers Vercel)
log "Pushing to aipokerboost repository..."
git push aipokerboost main >> "$LOG_FILE" 2>> "$ERROR_LOG" || {
    log_error "Push to aipokerboost failed"
    exit 1
}
log "✓ Pushed to aipokerboost (Vercel will auto-deploy)"

log "=== Auto-commit completed successfully ==="
log ""

exit 0

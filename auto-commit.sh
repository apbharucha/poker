#!/bin/bash

# Change to project directory
cd /Users/aavibharucha/Documents/Projects/poker

# Check if there are any changes
if [[ -n $(git status -s) ]]; then
    # Add all changes
    git add -A
    
    # Commit with timestamp
    git commit -m "Auto-commit: $(date '+%Y-%m-%d %H:%M:%S')"
    
    # Push to remote
    git push origin main
    
    echo "Changes committed and pushed at $(date)"
else
    echo "No changes to commit at $(date)"
fi

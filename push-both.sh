#!/bin/bash

# Script to push to both GitHub repositories
# Usage: ./push-both.sh "commit message"

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Pushing to both repositories...${NC}"

# Add all changes
git add -A

# Commit with provided message or default
COMMIT_MSG="${1:-Update code}"
git commit -m "$COMMIT_MSG" || echo "Nothing to commit"

# Push to poker repository
echo -e "${GREEN}📤 Pushing to poker repository...${NC}"
git push origin main

# Push to aipokerboost repository
echo -e "${GREEN}📤 Pushing to aipokerboost repository...${NC}"
git push aipokerboost main

echo -e "${GREEN}✅ Successfully pushed to both repositories!${NC}"
echo -e "${BLUE}🔄 Vercel will automatically deploy from aipokerboost repository${NC}"

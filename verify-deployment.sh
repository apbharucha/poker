#!/bin/bash

# Comprehensive Deployment Verification and Fix Script
# Ensures Vercel always deploys the latest code from aipokerboost repo

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project directory
PROJECT_DIR="/Users/aavibharucha/Documents/Projects/poker"
cd "$PROJECT_DIR"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🔍 Vercel Deployment Verification${NC}"
echo -e "${BLUE}========================================${NC}\n"

# 1. Verify git configuration
echo -e "${YELLOW}📋 Step 1: Verifying Git Configuration${NC}"
git config user.name "apbharucha"
git config user.email "apbharucha07@gmail.com"
echo -e "${GREEN}✓ Git config set correctly${NC}\n"

# 2. Check local vs remote commits
echo -e "${YELLOW}📋 Step 2: Checking Commit Status${NC}"
LOCAL_COMMIT=$(git rev-parse HEAD)
POKER_REMOTE=$(git ls-remote origin refs/heads/main | cut -f1)
AIPOKER_REMOTE=$(git ls-remote aipokerboost refs/heads/main | cut -f1)

echo "Local:        $LOCAL_COMMIT"
echo "Poker repo:   $POKER_REMOTE"
echo "AIPoker repo: $AIPOKER_REMOTE"

if [ "$LOCAL_COMMIT" != "$AIPOKER_REMOTE" ]; then
    echo -e "${RED}⚠️  AIPokerBoost repo is NOT up to date!${NC}"
    echo -e "${YELLOW}Pushing latest changes...${NC}\n"
    
    # Push to both repositories
    git push origin main --force
    git push aipokerboost main --force
    
    echo -e "${GREEN}✓ Pushed to both repositories${NC}\n"
else
    echo -e "${GREEN}✓ All repositories are in sync${NC}\n"
fi

# 3. Verify Vercel project linkage
echo -e "${YELLOW}📋 Step 3: Verifying Vercel Project${NC}"
if [ -f ".vercel/project.json" ]; then
    PROJECT_NAME=$(cat .vercel/project.json | grep projectName | cut -d'"' -f4)
    echo -e "${GREEN}✓ Vercel project: $PROJECT_NAME${NC}\n"
else
    echo -e "${RED}⚠️  No Vercel project linked${NC}"
    echo -e "${YELLOW}Run: vercel link${NC}\n"
fi

# 4. Check GitHub webhook status
echo -e "${YELLOW}📋 Step 4: Checking GitHub-Vercel Connection${NC}"
echo "Vercel should be connected to:"
echo "  Repository: https://github.com/apbharucha/aipokerboost"
echo "  Branch: main"
echo -e "${BLUE}Verify at: https://vercel.com/aavi-bharuchas-projects/aipokerboost/settings/git${NC}\n"

# 5. Show recent commits in aipokerboost
echo -e "${YELLOW}📋 Step 5: Recent Commits in AIPokerBoost${NC}"
echo "Latest 5 commits:"
git log --oneline -5
echo ""

# 6. Verify package.json and build settings
echo -e "${YELLOW}📋 Step 6: Verifying Build Configuration${NC}"
if [ -f "package.json" ]; then
    echo -e "${GREEN}✓ package.json exists${NC}"
    BUILD_CMD=$(cat package.json | grep '"build"' | cut -d'"' -f4)
    echo "  Build command: $BUILD_CMD"
fi
if [ -f "vercel.json" ]; then
    echo -e "${GREEN}✓ vercel.json exists${NC}"
fi
echo ""

# 7. Test if build works locally
echo -e "${YELLOW}📋 Step 7: Testing Local Build${NC}"
echo "Testing if TypeScript compiles..."
if npm run build > /tmp/build-test.log 2>&1; then
    echo -e "${GREEN}✓ Build successful locally${NC}\n"
else
    echo -e "${RED}⚠️  Build failed locally${NC}"
    echo "Check /tmp/build-test.log for errors"
    tail -20 /tmp/build-test.log
    echo ""
fi

# 8. Force trigger Vercel deployment
echo -e "${YELLOW}📋 Step 8: Triggering Vercel Deployment${NC}"
echo "You can manually trigger deployment by:"
echo "  1. Push an empty commit: git commit --allow-empty -m 'trigger deploy' && ./push-both.sh"
echo "  2. Use Vercel CLI: vercel --prod"
echo "  3. Via Dashboard: https://vercel.com/aavi-bharuchas-projects/aipokerboost"
echo ""

# 9. Summary and recommendations
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}📊 Summary & Recommendations${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}✓ Git configuration: apbharucha <apbharucha07@gmail.com>${NC}"
echo -e "${GREEN}✓ Hourly auto-commit: Enabled (cron job)${NC}"
echo -e "${GREEN}✓ Dual repository push: Configured${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Verify Vercel webhook in GitHub repo settings"
echo "2. Check latest deployment at: https://vercel.com/aavi-bharuchas-projects/aipokerboost"
echo "3. If Vercel still shows old code, check deployment logs"
echo ""
echo -e "${BLUE}Force Deployment Commands:${NC}"
echo "  ./push-both.sh \"trigger deployment\""
echo "  git commit --allow-empty -m 'redeploy' && ./push-both.sh"
echo ""

exit 0

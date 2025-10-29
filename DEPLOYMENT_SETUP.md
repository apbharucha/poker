# Dual Repository Deployment Setup

## Overview
This project pushes to **TWO** GitHub repositories:
1. **poker** - Backup/development repository
2. **aipokerboost** - Production repository (connected to Vercel)

## Repository URLs
- Poker: `https://github.com/apbharucha/poker.git`
- AIPokerBoost: `https://github.com/apbharucha/aipokerboost.git`

## Automatic Deployment Workflow

### Using the Push Script (Recommended)
```bash
# Push to both repositories at once
./push-both.sh "your commit message"
```

This script automatically:
1. Adds all changes
2. Commits with your message
3. Pushes to `poker` repository
4. Pushes to `aipokerboost` repository
5. Triggers Vercel auto-deployment

### Manual Push (Alternative)
```bash
# Add and commit changes
git add -A
git commit -m "your message"

# Push to both repositories
git push origin main        # poker repo
git push aipokerboost main  # aipokerboost repo (triggers Vercel)
```

## Vercel Configuration

### Current Setup
- **Project Name**: aipokerboost
- **Connected Repo**: https://github.com/apbharucha/aipokerboost
- **Production Branch**: main
- **Auto-Deploy**: Enabled ✅

### Update Vercel Connection
If Vercel is still connected to the wrong repo:

1. **Via Vercel Dashboard**:
   - Go to: https://vercel.com/dashboard
   - Select: **aipokerboost** project
   - Settings → Git → Disconnect
   - Connect to: **apbharucha/aipokerboost**

2. **Via CLI**:
   ```bash
   vercel unlink
   vercel link
   # Select: aipokerboost project
   ```

## Git Remote Configuration

### View Remotes
```bash
git remote -v
```

Should show:
```
aipokerboost    https://github.com/apbharucha/aipokerboost.git (fetch)
aipokerboost    https://github.com/apbharucha/aipokerboost.git (push)
origin          https://github.com/apbharucha/poker.git (fetch)
origin          https://github.com/apbharucha/poker.git (push)
```

### Add Remote (if missing)
```bash
git remote add aipokerboost https://github.com/apbharucha/aipokerboost.git
```

## Deployment Flow

```
Local Changes
     ↓
  Commit
     ↓
Push to BOTH repos
     ├─→ origin (poker)          [Backup]
     └─→ aipokerboost (main)     [Production]
              ↓
         Vercel Webhook
              ↓
      Automatic Build & Deploy
              ↓
         Production URL
```

## Troubleshooting

### Push Rejected
If you get "Updates were rejected":
```bash
git fetch aipokerboost
git merge aipokerboost/main --allow-unrelated-histories
# Resolve conflicts if any
git push aipokerboost main
```

### Force Push (Use with Caution)
```bash
git push aipokerboost main --force
```

### Vercel Not Deploying
1. Check Vercel dashboard for build errors
2. Verify webhook is active in GitHub repo settings
3. Manually trigger: `vercel --prod`

## Production URL
- **Live App**: Check Vercel dashboard
- **Latest Deploy**: https://vercel.com/aavi-bharuchas-projects/aipokerboost

## Notes
- Always push to **both** repositories to keep them in sync
- **aipokerboost** is the source of truth for production
- **poker** is for backup and development tracking
- Vercel auto-deploys from **aipokerboost** only

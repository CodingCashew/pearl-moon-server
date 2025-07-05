# Pearl Moon Server - Recovery & Deployment Guide

## ✅ What's Been Restored

Your project has been fully restored with the following files:

### Core Files

- ✅ `package.json` - Recreated with all dependencies and npm scripts
- ✅ `.env` - Updated with all required environment variables
- ✅ All TypeScript sync scripts (sync-quick.ts, sync-deep.ts, etc.)
- ✅ API endpoints in `/api/` directory
- ✅ Utility scripts for finding missing SKUs

### New Tools Added

- ✅ `deploy-to-ec2.sh` - Automated deployment script for EC2
- ✅ `verify-setup.ts` - Environment verification script
- ✅ `CRON-SETUP.md` - Detailed cron job setup instructions

### NPM Scripts Available

```bash
npm run sync:quick      # Quick sync (pages 1-100)
npm run sync:deep       # Deep sync (pages 101-248)
npm run sync:test       # Manual test sync
npm run find-missing    # Find SKUs missing from Nalpac
npm run set-missing-zero # Set missing SKUs to zero in Shopify
```

## 🚀 Deployment Instructions

### 1. Deploy to EC2

```bash
# Make sure you're in the project directory
cd /home/lyzeuph/pearl-moon-server

# Run the deployment script
./deploy-to-ec2.sh <your-ec2-ip-address> <path-to-your-key-file>

# Example:
./deploy-to-ec2.sh 54.123.45.67 ~/.ssh/my-aws-key.pem
```

### 2. Manual EC2 Setup (if deployment script fails)

```bash
# SSH into your EC2 instance
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip

# Create project directory
mkdir -p /home/ubuntu/pearl-moon-server

# Exit SSH and upload files manually
rsync -avz --exclude=node_modules/ --exclude=.git/ \
  -e "ssh -i ~/.ssh/your-key.pem" \
  ./ ubuntu@your-ec2-ip:/home/ubuntu/pearl-moon-server/

# SSH back in and install dependencies
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip
cd /home/ubuntu/pearl-moon-server
npm install
```

### 3. Set Up Environment on EC2

```bash
# Copy your .env file to EC2 (one of these methods):

# Method 1: SCP upload
scp -i ~/.ssh/your-key.pem .env ubuntu@your-ec2-ip:/home/ubuntu/pearl-moon-server/

# Method 2: Create manually on EC2
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip
cd /home/ubuntu/pearl-moon-server
nano .env
# Paste your environment variables
```

### 4. Test the Setup

```bash
# SSH into EC2
ssh -i ~/.ssh/your-key.pem ubuntu@your-ec2-ip
cd /home/ubuntu/pearl-moon-server

# Verify setup
npx tsx verify-setup.ts

# Test inventory sync
npm run sync:test
```

### 5. Set Up Cron Jobs

```bash
# On EC2, edit crontab
crontab -e

# Add these cron jobs:
# Quick sync every 2 hours (business hours)
0 8,10,12,14,16,18 * * 1-5 cd /home/ubuntu/pearl-moon-server && npm run sync:quick >> logs/cron.log 2>&1

# Deep sync once daily at 2 AM
0 2 * * * cd /home/ubuntu/pearl-moon-server && npm run sync:deep >> logs/cron.log 2>&1

# Weekly missing SKU cleanup on Sundays at 3 AM
0 3 * * 0 cd /home/ubuntu/pearl-moon-server && npm run find-missing >> logs/missing-skus.log 2>&1 && npm run set-missing-zero >> logs/missing-skus.log 2>&1
```

## 🔧 Environment Variables Configured

Your `.env` file now includes all required variables:

- ✅ `SHOPIFY_SHOP_DOMAIN` - Your Shopify store domain
- ✅ `SHOPIFY_ACCESS_TOKEN` - Shopify API access token
- ✅ `NALPAC_USERNAME` - Nalpac API username (email)
- ✅ `NALPAC_PASSWORD` - Nalpac API password
- ✅ `FULFILLMENT_SERVICE_NAME` - Set to "manual"
- ✅ `NALPAC_MAX_PAGES` - Set to 150 for balanced coverage

## 📊 System Overview

### Sync Strategy

- **Quick Sync**: Pages 1-100 (every 2 hours during business hours)
- **Deep Sync**: Pages 101-248 (daily at 2 AM)
- **Missing SKU Cleanup**: Weekly on Sundays

### Coverage

- Quick sync: ~10,000 Nalpac items (most popular)
- Deep sync: ~15,000 additional items (niche products)
- Total coverage: ~25,000 Nalpac items

## 🆘 Troubleshooting

### If Deployment Fails

1. Check EC2 security groups allow SSH (port 22)
2. Verify your key file permissions: `chmod 400 ~/.ssh/your-key.pem`
3. Ensure EC2 instance is running

### If Sync Fails

1. Check `.env` file is present on EC2
2. Verify all environment variables: `npx tsx verify-setup.ts`
3. Check logs: `tail -f logs/cron.log`

### If Cron Jobs Don't Run

1. Check cron service: `sudo systemctl status cron`
2. Verify crontab: `crontab -l`
3. Check cron logs: `grep CRON /var/log/syslog`

## 🎯 Next Steps After Deployment

1. Monitor the first few syncs manually
2. Check logs regularly for any issues
3. Verify inventory updates in Shopify
4. Set up monitoring/alerting if needed

Your Pearl Moon Server is now fully restored and ready for production deployment!

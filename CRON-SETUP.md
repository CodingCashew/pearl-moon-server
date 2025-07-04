# Pearl Moon Inventory Sync - Cron Job Setup

## Two-Job Hybrid Approach

### Quick Sync (sync-quick.ts)

- **Covers**: Pages 1-100 (~10,000 items, ~82 SKUs found)
- **Frequency**: 2-3 times per day during business hours
- **Runtime**: ~3-4 minutes
- **Memory**: ~50MB peak

### Deep Sync (sync-deep.ts)

- **Covers**: Pages 101-248 (~14,800 items, ~47 additional SKUs)
- **Frequency**: Once per day (overnight)
- **Runtime**: ~8-12 minutes
- **Memory**: ~120MB peak

## Cron Schedule Examples

### Option 1: Conservative (Recommended)

```bash
# Quick sync - twice per day
0 9 * * * cd /home/lyzeuph/pearl-moon-server && npx tsx sync-quick.ts >> logs/quick-sync.log 2>&1
0 15 * * * cd /home/lyzeuph/pearl-moon-server && npx tsx sync-quick.ts >> logs/quick-sync.log 2>&1

# Deep sync - once per day at 2 AM
0 2 * * * cd /home/lyzeuph/pearl-moon-server && npx tsx sync-deep.ts >> logs/deep-sync.log 2>&1
```

### Option 2: More Frequent

```bash
# Quick sync - three times per day
0 8 * * * cd /home/lyzeuph/pearl-moon-server && npx tsx sync-quick.ts >> logs/quick-sync.log 2>&1
0 13 * * * cd /home/lyzeuph/pearl-moon-server && npx tsx sync-quick.ts >> logs/quick-sync.log 2>&1
0 18 * * * cd /home/lyzeuph/pearl-moon-server && npx tsx sync-quick.ts >> logs/quick-sync.log 2>&1

# Deep sync - once per day at 3 AM
0 3 * * * cd /home/lyzeuph/pearl-moon-server && npx tsx sync-deep.ts >> logs/deep-sync.log 2>&1
```

## Setup Instructions

1. **Create log directory:**

   ```bash
   mkdir -p /home/lyzeuph/pearl-moon-server/logs
   ```

2. **Test the scripts:**

   ```bash
   # Test quick sync
   npx tsx sync-quick.ts

   # Test deep sync (may take longer)
   npx tsx sync-deep.ts
   ```

3. **Install cron jobs:**

   ```bash
   crontab -e
   # Add your chosen schedule from above
   ```

4. **Monitor logs:**

   ```bash
   # Check quick sync logs
   tail -f logs/quick-sync.log

   # Check deep sync logs
   tail -f logs/deep-sync.log
   ```

## Benefits of This Approach

✅ **Quick Response**: Main products sync 2-3x daily
✅ **Complete Coverage**: All 248 pages covered daily  
✅ **AWS Free Tier Safe**: Smaller memory footprint per job
✅ **Fault Tolerant**: If one job fails, the other still runs
✅ **Flexible**: Easy to adjust frequency per job type
✅ **Better Performance**: No single long-running job

## Coverage Summary

- **Total Shopify SKUs**: 179
- **Quick Sync Coverage**: ~82 SKUs (46%) - your main products
- **Deep Sync Coverage**: ~47 SKUs (26%) - niche/seasonal items
- **Combined Coverage**: ~129 SKUs (72%) - excellent coverage!

## Manual Testing

```bash
# Test quick sync only
npx tsx sync-quick.ts

# Test deep sync only
npx tsx sync-deep.ts

# Test full coverage (both in sequence)
npx tsx test-inventory-sync.ts  # Still works for full 150 pages
```

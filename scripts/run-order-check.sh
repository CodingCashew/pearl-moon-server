#!/bin/bash

# Change to the project directory
cd /home/lyzeuph/pearl-moon-server

# Set NODE_ENV if needed
export NODE_ENV=production

# Run the order check with proper logging
echo "[$(date)] Starting order status check..." >> logs/cron.log
node scripts/check-orders.js >> logs/cron.log 2>&1
EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "[$(date)] Order check completed successfully" >> logs/cron.log
else
    echo "[$(date)] Order check failed with exit code $EXIT_CODE" >> logs/cron.log
fi

# Rotate log file if it gets too large (keep last 1000 lines)
if [ -f logs/cron.log ] && [ $(wc -l < logs/cron.log) -gt 1000 ]; then
    tail -1000 logs/cron.log > logs/cron.log.tmp && mv logs/cron.log.tmp logs/cron.log
fi

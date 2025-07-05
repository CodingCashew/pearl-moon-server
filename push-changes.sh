#!/bin/bash

# Push Local Changes to EC2 Instance
# Usage: ./push-changes.sh <ec2-ip-address> <key-file-path> [file-or-directory]

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Push Changes to EC2${NC}"
echo "========================="

# Check parameters
if [ $# -lt 2 ]; then
    echo -e "${RED}Error: Missing parameters${NC}"
    echo "Usage: $0 <ec2-ip-address> <key-file-path> [specific-file]"
    echo ""
    echo "Examples:"
    echo "  $0 54.123.45.67 ~/.ssh/my-key.pem                    # Push all changes"
    echo "  $0 54.123.45.67 ~/.ssh/my-key.pem sync-deep.ts       # Push specific file"
    echo "  $0 54.123.45.67 ~/.ssh/my-key.pem .env               # Push env file"
    exit 1
fi

EC2_IP=$1
KEY_FILE=$2
SPECIFIC_FILE=$3
EC2_USER="ubuntu"
PROJECT_DIR="/home/ubuntu/pearl-moon-server"

# Check if key file exists
if [ ! -f "$KEY_FILE" ]; then
    echo -e "${RED}Error: Key file not found at $KEY_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}Target: $EC2_USER@$EC2_IP:$PROJECT_DIR${NC}"
echo -e "${YELLOW}Key file: $KEY_FILE${NC}"

if [ -n "$SPECIFIC_FILE" ]; then
    # Push specific file
    if [ ! -f "$SPECIFIC_FILE" ] && [ ! -d "$SPECIFIC_FILE" ]; then
        echo -e "${RED}Error: File/directory '$SPECIFIC_FILE' not found${NC}"
        exit 1
    fi
    
    echo -e "${YELLOW}Pushing specific file: $SPECIFIC_FILE${NC}"
    
    rsync -avz --progress \
        -e "ssh -i $KEY_FILE" \
        "$SPECIFIC_FILE" "$EC2_USER@$EC2_IP:$PROJECT_DIR/"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Successfully pushed $SPECIFIC_FILE${NC}"
    else
        echo -e "${RED}❌ Failed to push $SPECIFIC_FILE${NC}"
        exit 1
    fi
else
    # Push all changes (exclude large directories)
    echo -e "${YELLOW}Pushing all project changes...${NC}"
    
    EXCLUDE_PATTERNS=(
        "--exclude=node_modules/"
        "--exclude=.git/"
        "--exclude=.vercel/"
        "--exclude=dist/"
        "--exclude=logs/"
        "--exclude=*.log"
        "--exclude=.env.local"
        "--exclude=.env.development"
    )
    
    rsync -avz --progress "${EXCLUDE_PATTERNS[@]}" \
        -e "ssh -i $KEY_FILE" \
        ./ "$EC2_USER@$EC2_IP:$PROJECT_DIR/"
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Successfully pushed all changes${NC}"
    else
        echo -e "${RED}❌ Failed to push changes${NC}"
        exit 1
    fi
fi

# Optional: Restart any services or run npm install if package.json changed
if [ -z "$SPECIFIC_FILE" ] || [ "$SPECIFIC_FILE" = "package.json" ]; then
    echo -e "${YELLOW}Checking if npm install is needed...${NC}"
    
    ssh -i "$KEY_FILE" "$EC2_USER@$EC2_IP" << 'EOF'
cd /home/ubuntu/pearl-moon-server

if [ -f "package.json" ]; then
    echo "📦 Running npm install to update dependencies..."
    npm install
    echo "✅ Dependencies updated"
fi
EOF
fi

echo ""
echo -e "${GREEN}🎯 Push completed!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. SSH into EC2 to test changes:"
echo "   ssh -i $KEY_FILE $EC2_USER@$EC2_IP"
echo ""
echo "2. Test the updated code:"
echo "   cd $PROJECT_DIR"
echo "   npm run sync:test"
echo ""
echo "3. Check cron jobs are still scheduled:"
echo "   crontab -l"

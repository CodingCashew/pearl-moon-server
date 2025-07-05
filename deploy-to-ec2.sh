#!/bin/bash

# EC2 Deployment Script for Pearl Moon Server
# Usage: ./deploy-to-ec2.sh <ec2-ip-address> <key-file-path>

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Pearl Moon Server EC2 Deployment Script${NC}"
echo "============================================"

# Check if parameters are provided
if [ $# -ne 2 ]; then
    echo -e "${RED}Error: Missing parameters${NC}"
    echo "Usage: $0 <ec2-ip-address> <key-file-path>"
    echo "Example: $0 54.123.45.67 ~/.ssh/my-key.pem"
    exit 1
fi

EC2_IP=$1
KEY_FILE=$2
EC2_USER="ubuntu"
PROJECT_DIR="/home/ubuntu/pearl-moon-server"

# Check if key file exists
if [ ! -f "$KEY_FILE" ]; then
    echo -e "${RED}Error: Key file not found at $KEY_FILE${NC}"
    exit 1
fi

echo -e "${YELLOW}Deploying to EC2 instance: $EC2_IP${NC}"
echo -e "${YELLOW}Using key file: $KEY_FILE${NC}"

# Create project directory on EC2
echo -e "${YELLOW}Creating project directory on EC2...${NC}"
ssh -i "$KEY_FILE" "$EC2_USER@$EC2_IP" "mkdir -p $PROJECT_DIR"

# Files to exclude from upload
EXCLUDE_PATTERNS=(
    "--exclude=node_modules/"
    "--exclude=.git/"
    "--exclude=.vercel/"
    "--exclude=dist/"
    "--exclude=logs/"
    "--exclude=*.log"
    "--exclude=.env.local"
    "--exclude=.env.development"
    "--exclude=deploy-to-ec2.sh"
)

# Upload project files to EC2
echo -e "${YELLOW}Uploading project files to EC2...${NC}"
rsync -avz --progress "${EXCLUDE_PATTERNS[@]}" \
    -e "ssh -i $KEY_FILE" \
    ./ "$EC2_USER@$EC2_IP:$PROJECT_DIR/"

# Install dependencies and setup on EC2
echo -e "${YELLOW}Installing dependencies on EC2...${NC}"
ssh -i "$KEY_FILE" "$EC2_USER@$EC2_IP" << 'EOF'
cd /home/ubuntu/pearl-moon-server

# Install Node.js if not present
if ! command -v node &> /dev/null; then
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install dependencies
echo "Installing npm dependencies..."
npm install

# Set proper permissions
chmod +x *.sh 2>/dev/null || true

# Create logs directory
mkdir -p logs

echo "Installation complete!"
echo "Node.js version: $(node --version)"
echo "NPM version: $(npm --version)"
EOF

echo -e "${GREEN}Deployment completed successfully!${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. SSH into your EC2 instance:"
echo "   ssh -i $KEY_FILE $EC2_USER@$EC2_IP"
echo ""
echo "2. Navigate to the project directory:"
echo "   cd $PROJECT_DIR"
echo ""
echo "3. Copy your .env file to the server (create it manually or upload it):"
echo "   nano .env"
echo ""
echo "4. Test the inventory sync:"
echo "   npm run sync:test"
echo ""
echo "5. Set up cron jobs (refer to CRON-SETUP.md):"
echo "   crontab -e"
echo ""
echo -e "${GREEN}Your Pearl Moon Server is now deployed!${NC}"

#!/bin/bash

# EC2 Connection Test Script
echo "🔍 EC2 Connection Test"
echo "====================="

# Check if parameters are provided
if [ $# -ne 2 ]; then
    echo "❌ Usage: $0 <ec2-ip-address> <key-file-path>"
    echo "Example: $0 54.123.45.67 ~/.ssh/my-key.pem"
    exit 1
fi

EC2_IP=$1
KEY_FILE=$2
EC2_USER="ubuntu"

echo "Testing connection to: $EC2_IP"
echo "Using key file: $KEY_FILE"

# Check if key file exists
if [ ! -f "$KEY_FILE" ]; then
    echo "❌ Key file not found at $KEY_FILE"
    exit 1
fi

# Check key file permissions
PERMS=$(stat -c "%a" "$KEY_FILE")
if [ "$PERMS" != "400" ] && [ "$PERMS" != "600" ]; then
    echo "⚠️  Fixing key file permissions..."
    chmod 400 "$KEY_FILE"
fi

# Test SSH connection
echo "🔌 Testing SSH connection..."
ssh -i "$KEY_FILE" -o ConnectTimeout=10 -o BatchMode=yes "$EC2_USER@$EC2_IP" "echo 'SSH connection successful!'" 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ SSH connection works!"
    echo "🚀 You're ready to deploy. Run:"
    echo "   ./deploy-to-ec2.sh $EC2_IP $KEY_FILE"
else
    echo "❌ SSH connection failed. Check:"
    echo "   - EC2 instance is running"
    echo "   - Security group allows SSH (port 22)"
    echo "   - IP address is correct"
    echo "   - Key file is correct"
fi

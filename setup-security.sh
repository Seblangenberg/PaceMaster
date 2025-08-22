#!/bin/bash

# Hunter Pace App - Security Setup Script
# This script helps set up the secure environment for the app

echo "🔐 Hunter Pace App - Security Setup"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if .env.local exists
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}⚠️  .env.local not found. Creating from template...${NC}"
    cp env.example .env.local
    echo -e "${GREEN}✅ Created .env.local from env.example${NC}"
    echo -e "${YELLOW}📝 You need to edit .env.local with your Firebase credentials${NC}"
else
    echo -e "${GREEN}✅ .env.local already exists${NC}"
fi

# Check if .secrets directory exists
if [ ! -d ".secrets" ]; then
    echo -e "${YELLOW}⚠️  .secrets directory not found. Creating...${NC}"
    mkdir -p .secrets
    echo -e "${GREEN}✅ Created .secrets directory${NC}"
else
    echo -e "${GREEN}✅ .secrets directory exists${NC}"
fi

# Check for Firebase service account key
if [ ! -f ".secrets/firebase-functions-key.json" ]; then
    echo -e "${RED}❌ Firebase service account key not found at .secrets/firebase-functions-key.json${NC}"
    echo -e "${YELLOW}📖 To fix this:${NC}"
    echo "   1. Go to Firebase Console > Project Settings > Service Accounts"
    echo "   2. Click 'Generate new private key'"
    echo "   3. Download the JSON file"
    echo "   4. Save it as .secrets/firebase-functions-key.json"
else
    echo -e "${GREEN}✅ Firebase service account key found${NC}"
fi

# Check Node.js and npm
if command -v node >/dev/null 2>&1; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✅ Node.js ${NODE_VERSION} is installed${NC}"
else
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo -e "${YELLOW}Please install Node.js 18+ from https://nodejs.org/${NC}"
    exit 1
fi

if command -v npm >/dev/null 2>&1; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✅ npm ${NPM_VERSION} is installed${NC}"
else
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠️  Node modules not found. Installing dependencies...${NC}"
    npm install
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Dependencies installed successfully${NC}"
    else
        echo -e "${RED}❌ Failed to install dependencies${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Dependencies are installed${NC}"
fi

# Check Firebase CLI
if command -v firebase >/dev/null 2>&1; then
    FIREBASE_VERSION=$(firebase --version)
    echo -e "${GREEN}✅ Firebase CLI ${FIREBASE_VERSION} is installed${NC}"
else
    echo -e "${YELLOW}⚠️  Firebase CLI not found. Installing globally...${NC}"
    npm install -g firebase-tools
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Firebase CLI installed successfully${NC}"
    else
        echo -e "${YELLOW}⚠️  Failed to install Firebase CLI globally. You can install it manually:${NC}"
        echo "   npm install -g firebase-tools"
    fi
fi

echo ""
echo -e "${BLUE}📋 Security Checklist:${NC}"
echo "=================================="

# Check if .gitignore includes sensitive files
if grep -q "firebase-functions-key.json" .gitignore; then
    echo -e "${GREEN}✅ .gitignore includes Firebase service account key${NC}"
else
    echo -e "${RED}❌ .gitignore missing Firebase service account key${NC}"
fi

if grep -q ".env.local" .gitignore; then
    echo -e "${GREEN}✅ .gitignore includes .env.local${NC}"
else
    echo -e "${RED}❌ .gitignore missing .env.local${NC}"
fi

if grep -q ".secrets/" .gitignore; then
    echo -e "${GREEN}✅ .gitignore includes .secrets directory${NC}"
else
    echo -e "${RED}❌ .gitignore missing .secrets directory${NC}"
fi

echo ""
echo -e "${BLUE}🚀 Next Steps:${NC}"
echo "=================================="
echo "1. Edit .env.local with your Firebase project credentials"
echo "2. Download your Firebase service account key to .secrets/firebase-functions-key.json"
echo "3. Run 'npm run dev' to start the development server"
echo "4. Read SECURITY.md for detailed security instructions"

echo ""
echo -e "${YELLOW}⚠️  IMPORTANT SECURITY REMINDERS:${NC}"
echo "• NEVER commit .env.local or files in .secrets/ to version control"
echo "• Rotate your Firebase credentials if they were previously exposed"
echo "• Use different Firebase projects for development and production"
echo "• Enable Firebase security monitoring"

echo ""
echo -e "${GREEN}🎉 Security setup complete!${NC}"
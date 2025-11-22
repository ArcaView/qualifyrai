#!/bin/bash

# ParseScore LLM Integration - Deployment Script
# This script copies all LLM integration files to your project

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================================="
echo "  ParseScore LLM Integration Deployment"
echo "=================================================="
echo ""

# Check if running from correct directory
if [ ! -f "app/main.py" ]; then
    echo -e "${RED}❌ Error: app/main.py not found${NC}"
    echo "   Please run this script from your ParseScore project root"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Found ParseScore project${NC}"
echo ""

# Confirm deployment
read -p "Deploy LLM integration to this project? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Deployment cancelled."
    exit 0
fi

echo ""
echo "📦 Deploying LLM integration..."
echo ""

# Create backup directory
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Function to backup and copy
backup_and_copy() {
    local src=$1
    local dst=$2
    
    if [ -f "$dst" ]; then
        echo "   📋 Backing up existing: $dst"
        cp "$dst" "$BACKUP_DIR/"
    fi
    
    echo "   ✅ Copying: $src → $dst"
    cp "$src" "$dst"
}

# 1. Core implementation files
echo "1️⃣  Core Implementation Files"

mkdir -p app/scoring
mkdir -p app/routes

if [ -f "/home/claude/app/scoring/llm_scorer.py" ]; then
    backup_and_copy "/home/claude/app/scoring/llm_scorer.py" "app/scoring/llm_scorer.py"
else
    echo -e "${YELLOW}   ⚠️  llm_scorer.py not found in /home/claude${NC}"
fi

if [ -f "/home/claude/app/scoring/__init__.py" ]; then
    backup_and_copy "/home/claude/app/scoring/__init__.py" "app/scoring/__init__.py"
fi

if [ -f "/home/claude/app/routes/score.py" ]; then
    backup_and_copy "/home/claude/app/routes/score.py" "app/routes/score.py"
fi

echo ""

# 2. Dependencies
echo "2️⃣  Dependencies"

if [ -f "/home/claude/requirements.txt" ]; then
    backup_and_copy "/home/claude/requirements.txt" "requirements.txt"
fi

echo ""

# 3. Configuration
echo "3️⃣  Configuration Templates"

if [ -f "/home/claude/.env.example" ]; then
    backup_and_copy "/home/claude/.env.example" ".env.example"
fi

echo ""

# 4. Testing & Utilities
echo "4️⃣  Testing & Utility Scripts"

FILES_TO_COPY=(
    "test_llm_scoring.py"
    "check_llm_config.py"
)

for file in "${FILES_TO_COPY[@]}"; do
    if [ -f "/home/claude/$file" ]; then
        backup_and_copy "/home/claude/$file" "$file"
        chmod +x "$file"
    fi
done

echo ""

# 5. Documentation
echo "5️⃣  Documentation"

DOCS=(
    "LLM_SETUP.md"
    "LLM_IMPLEMENTATION_SUMMARY.md"
    "DEPLOYMENT_GUIDE.md"
)

for doc in "${DOCS[@]}"; do
    if [ -f "/home/claude/$doc" ]; then
        backup_and_copy "/home/claude/$doc" "$doc"
    fi
done

echo ""

# Summary
echo "=================================================="
echo "  ✅ Deployment Complete!"
echo "=================================================="
echo ""

if [ -d "$BACKUP_DIR" ] && [ "$(ls -A $BACKUP_DIR)" ]; then
    echo "📋 Backups saved to: $BACKUP_DIR/"
    echo ""
fi

echo "📝 Next Steps:"
echo ""
echo "   1. Install dependencies:"
echo "      pip install -r requirements.txt"
echo ""
echo "   2. Configure LLM in .env:"
echo "      cp .env.example .env"
echo "      # Edit .env and add:"
echo "      LLM_ENABLED=true"
echo "      LLM_PROVIDER=openai"
echo "      LLM_API_KEY=sk-your-key-here"
echo ""
echo "   3. Verify configuration:"
echo "      python check_llm_config.py"
echo ""
echo "   4. Test LLM scoring:"
echo "      uvicorn app.main:app --reload"
echo "      # In another terminal:"
echo "      python test_llm_scoring.py"
echo ""
echo "📖 Documentation: See LLM_SETUP.md"
echo ""
echo "🎉 You're ready to go!"
echo ""

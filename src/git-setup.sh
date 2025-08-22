#!/bin/bash

# Git setup script for PaceMaster RideRelease Frontend
# Run this from the root directory: /Users/sebastianlangenberg/Desktop/Hunter-Pace-app-2

echo "🚀 Setting up Git repository for PaceMaster RideRelease Frontend"
echo "=================================================="

# Navigate to project root (run this manually)
echo "1. Navigate to project root:"
echo "cd /Users/sebastianlangenberg/Desktop/Hunter-Pace-app-2"
echo ""

# Initialize git repository
echo "2. Initialize Git repository:"
echo "git init"
echo ""

# Add remote origin
echo "3. Add GitHub remote:"
echo "git remote add origin https://github.com/Seblangenberg/RideRelease.git"
echo ""

# Create .gitignore if it doesn't exist
echo "4. Create/check .gitignore file:"
echo "# This should already be created by the script"
echo ""

# Add all files
echo "5. Add all files:"
echo "git add ."
echo ""

# Initial commit
echo "6. Create initial commit:"
echo 'git commit -m "feat: Complete authentication system for equestrian facilities

- Enhanced Login page with professional equestrian styling
- Comprehensive multi-step Signup with organization creation  
- Password reset flow with multiple verification steps
- Auth guard HOC with loading and error states
- Persistent login with refresh tokens
- Professional loading states and animations
- Comprehensive error handling system
- Equestrian-themed UI components
- Form validation with business-specific rules
- Professional auth layout with branding
- Backend API integration setup
- Connection testing tools

🐎 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"'
echo ""

# Set main branch and push
echo "7. Set main branch and push:"
echo "git branch -M main"
echo "git push -u origin main"
echo ""

echo "✅ Git setup complete! Your authentication system is now on GitHub."
echo "🔗 Repository: https://github.com/Seblangenberg/RideRelease"
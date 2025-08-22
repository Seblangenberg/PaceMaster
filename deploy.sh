#!/bin/bash

echo "🚀 Deploying Hunter Pace App to Firebase..."

# Navigate to project directory
cd "$(dirname "$0")"

# Check if Firebase CLI is installed
if ! command -v firebase &> /dev/null; then
    echo "❌ Firebase CLI not found. Please install it first:"
    echo "npm install -g firebase-tools"
    exit 1
fi

# Check if user is logged in to Firebase
if ! firebase projects:list &> /dev/null; then
    echo "❌ Not logged in to Firebase. Please run:"
    echo "firebase login"
    exit 1
fi

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Install Firebase Functions dependencies
echo "📦 Installing Firebase Functions dependencies..."
cd functions
npm install
cd ..

# Build the application
echo "🔨 Building the application..."
npm run build

# Check if build was successful
if [ $? -eq 0 ]; then
    echo "✅ Build successful! Deploying to Firebase..."
    
    # Deploy Firebase Functions first
    echo "🚀 Deploying Firebase Functions..."
    firebase deploy --only functions
    
    if [ $? -eq 0 ]; then
        echo "✅ Functions deployed successfully!"
    else
        echo "❌ Functions deployment failed"
        exit 1
    fi
    
    # Deploy Firestore rules and indexes
    echo "🗄️ Deploying Firestore rules and indexes..."
    firebase deploy --only firestore
    
    if [ $? -eq 0 ]; then
        echo "✅ Firestore deployed successfully!"
    else
        echo "❌ Firestore deployment failed"
        exit 1
    fi
    
    # Deploy Storage rules
    echo "📁 Deploying Storage rules..."
    firebase deploy --only storage
    
    if [ $? -eq 0 ]; then
        echo "✅ Storage deployed successfully!"
    else
        echo "❌ Storage deployment failed"
        exit 1
    fi
    
    # Deploy hosting
    echo "🌐 Deploying hosting..."
    firebase deploy --only hosting
    
    if [ $? -eq 0 ]; then
        echo "🎉 Full deployment successful!"
        echo "Your app should be live at your Firebase hosting URL"
        echo ""
        echo "📋 Deployment Summary:"
        echo "✅ Firebase Functions"
        echo "✅ Firestore Database"
        echo "✅ Storage Rules"
        echo "✅ Web Hosting"
        echo ""
        echo "🔗 Next steps:"
        echo "1. Set up your environment variables in .env.local"
        echo "2. Configure Firebase Authentication providers"
        echo "3. Set up custom domain (optional)"
        echo "4. Monitor your app in Firebase Console"
    else
        echo "❌ Hosting deployment failed"
        exit 1
    fi
else
    echo "❌ Build failed"
    exit 1
fi